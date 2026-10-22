package backend.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Rule-based answer evaluation. This is NOT an AI model.
 *
 * Score = 50% keyword coverage + 20% relevance + 20% completeness + 10% clarity.
 *  - keyword coverage: how many of the question's key concepts appear in the answer
 *  - relevance: word overlap with the reference answer
 *  - completeness: answer length compared with a target for the difficulty
 *  - clarity: sentence structure (typed) or filler words (speech transcripts)
 * Very short answers are capped so that listing keywords alone cannot give a high score.
 */
@Service
public class EvaluationService {

    public static final String METHOD = "RULE_BASED_KEYWORD";

    public static final String NOTE =
            "Scores come from keyword, length and structure rules. They are not produced by an AI model "
                    + "and cannot judge facts that are not in the question's key-concept list. A correct answer "
                    + "worded very differently may score lower than it deserves. Use the score as a study guide, "
                    + "not as a verdict. Facial expressions and emotions are never analysed.";

    private static final Set<String> STOP_WORDS = new HashSet<>(Arrays.asList(
            "the", "and", "for", "with", "that", "this", "are", "was", "were", "its", "can", "you", "your",
            "which", "what", "how", "when", "does", "not", "but", "then", "than", "they", "their", "them",
            "have", "has", "had", "will", "would", "should", "could", "our", "from", "into", "also", "such",
            "any", "all", "one", "each", "per", "use", "used", "using", "may", "more", "most", "other"));

    private static final Set<String> SUFFIXES = new HashSet<>(Arrays.asList(
            "s", "es", "ed", "d", "ing", "ion", "ions", "er", "ers", "ly", "ment", "ments"));

    private static final List<String> FILLER_WORDS = List.of("um", "umm", "uh", "uhh", "erm", "hmm", "basically", "literally");
    private static final List<String> FILLER_PHRASES = List.of("you know", "i mean", "kind of", "sort of");
    private static final List<String> CONNECTORS = List.of("because", "for example", "for instance", "such as",
            "therefore", "however", "first", "second", "finally", "also", "in addition", "as a result", "so that");

    public record Result(int score, int keywordScore, int relevanceScore, int completenessScore,
                         int clarityScore, Integer fillerWordCount, List<String> matched,
                         List<String> missing, int wordCount, String feedback) {
    }

    public Result evaluate(String questionText, String answer, String keywordSpec, String referenceAnswer,
                           String difficulty, String inputMethod) {

        String text = answer == null ? "" : answer.trim();
        String norm = normalize(text);
        List<String> tokens = norm.isEmpty() ? new ArrayList<>() : Arrays.asList(norm.split(" "));
        int words = tokens.size();
        List<String> groups = parseGroups(keywordSpec);

        if (words == 0) {
            return new Result(0, 0, 0, 0, 0, null, new ArrayList<>(), keywordDisplayNames(keywordSpec), 0,
                    "No answer was provided for this question.");
        }

        String padded = " " + norm + " ";
        String compact = norm.replace(" ", "");

        // 1) keyword coverage
        List<String> matched = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        for (String group : groups) {
            String[] variants = group.split("/");
            boolean hit = false;
            for (String variant : variants) {
                if (matches(variant.trim(), tokens, padded, compact)) {
                    hit = true;
                    break;
                }
            }
            (hit ? matched : missing).add(variants[0].trim());
        }
        int keywordScore = groups.isEmpty() ? 0 : percent(matched.size(), groups.size());

        // 2) relevance (overlap with the reference answer, or the question if there is none)
        String source = (referenceAnswer == null || referenceAnswer.isBlank()) ? questionText : referenceAnswer;
        Set<String> refStems = contentStems(normalize(source == null ? "" : source));
        Set<String> answerStems = contentStems(norm);
        int relevanceScore = 0;
        if (!refStems.isEmpty()) {
            int common = 0;
            for (String stem : refStems) {
                if (answerStems.contains(stem)) common++;
            }
            double overlap = (double) common / refStems.size();
            relevanceScore = (int) Math.min(100, Math.round(overlap / 0.4 * 100));
        }

        // 3) completeness
        int target = targetWords(difficulty);
        int completenessScore = percent(Math.min(words, target), target);

        // 4) clarity
        boolean speech = "SPEECH".equalsIgnoreCase(inputMethod);
        Integer fillers = null;
        int clarityScore;
        if (speech) {
            int f = countFillers(padded);
            fillers = f;
            clarityScore = clamp(100 - (int) Math.round(((double) f / words) * 300));
        } else {
            int sentences = 0;
            for (String s : text.split("[.!?]+")) {
                if (!s.isBlank()) sentences++;
            }
            sentences = Math.max(sentences, 1);
            double avgLength = (double) words / sentences;
            int connectorHits = 0;
            for (String c : CONNECTORS) {
                if (padded.contains(" " + c + " ")) connectorHits++;
            }
            int structure = (sentences >= 2 ? 40 : 15)
                    + ((avgLength >= 5 && avgLength <= 35) ? 30 : 10)
                    + (connectorHits >= 1 ? 30 : 10);
            clarityScore = clamp(structure);
        }

        int score = (int) Math.round(0.5 * keywordScore + 0.2 * relevanceScore
                + 0.2 * completenessScore + 0.1 * clarityScore);

        // Caps so that keyword stuffing or one-liners cannot score highly.
        if (words < 8) score = Math.min(score, 25);
        else if (words < 15) score = Math.min(score, 50);
        // An answer that mentions none of the key concepts and shares almost no words with the reference is off topic.
        if (keywordScore == 0 && relevanceScore < 20) score = Math.min(score, 15);
        score = clamp(score);

        String feedback = buildFeedback(score, matched, missing, words, target, fillers);
        return new Result(score, keywordScore, relevanceScore, completenessScore, clarityScore,
                fillers, matched, missing, words, feedback);
    }

    /** First variant of every key concept, used to list concepts for unanswered questions. */
    public List<String> keywordDisplayNames(String keywordSpec) {
        List<String> names = new ArrayList<>();
        for (String group : parseGroups(keywordSpec)) {
            names.add(group.split("/")[0].trim());
        }
        return names;
    }

    // ----------------------------------------------------------------- helpers

    private List<String> parseGroups(String spec) {
        List<String> groups = new ArrayList<>();
        if (spec == null) return groups;
        for (String g : spec.split(";")) {
            if (!g.isBlank()) groups.add(g.trim());
        }
        return groups;
    }

    static String normalize(String s) {
        return s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9+#]+", " ").trim();
    }

    private boolean matches(String variant, List<String> tokens, String padded, String compact) {
        String kw = normalize(variant);
        if (kw.isEmpty()) return false;

        if (kw.contains(" ")) {
            if (padded.contains(" " + kw)) return true;
            String joined = kw.replace(" ", "");
            return joined.length() >= 8 && compact.contains(joined);
        }
        for (String t : tokens) {
            if (wordMatches(t, kw)) return true;
        }
        // speech engines sometimes split words ("use state"), so also try the joined text
        return kw.length() >= 6 && compact.contains(kw);
    }

    private boolean wordMatches(String token, String kw) {
        int len = kw.length();
        if (len <= 3) return token.equals(kw);
        if (len <= 5) {
            return token.equals(kw)
                    || (token.startsWith(kw) && SUFFIXES.contains(token.substring(kw.length())));
        }
        return token.startsWith(kw.substring(0, len - 2));
    }

    private Set<String> contentStems(String normalizedText) {
        Set<String> stems = new HashSet<>();
        if (normalizedText.isEmpty()) return stems;
        for (String t : normalizedText.split(" ")) {
            if (t.length() < 3 || STOP_WORDS.contains(t)) continue;
            stems.add(t.length() > 5 ? t.substring(0, 5) : t);
        }
        return stems;
    }

    private int targetWords(String difficulty) {
        if ("ADVANCED".equals(difficulty)) return 70;
        if ("INTERMEDIATE".equals(difficulty)) return 50;
        return 35;
    }

    private int countFillers(String padded) {
        int count = 0;
        for (String f : FILLER_WORDS) count += occurrences(padded, " " + f + " ");
        for (String f : FILLER_PHRASES) count += occurrences(padded, " " + f + " ");
        return count;
    }

    private int occurrences(String text, String needle) {
        int count = 0;
        int from = 0;
        while (true) {
            int i = text.indexOf(needle, from);
            if (i < 0) return count;
            count++;
            from = i + needle.length() - 1; // allow adjacent matches to share the space
        }
    }

    private int percent(int part, int whole) {
        return whole == 0 ? 0 : (int) Math.round(100.0 * part / whole);
    }

    private int clamp(int v) {
        return Math.max(0, Math.min(100, v));
    }

    private String buildFeedback(int score, List<String> matched, List<String> missing,
                                 int words, int target, Integer fillers) {
        StringBuilder sb = new StringBuilder();
        if (score >= 80) sb.append("Strong answer. ");
        else if (score >= 60) sb.append("Good answer with room to improve. ");
        else if (score >= 40) sb.append("Partly covered, but important points are missing. ");
        else sb.append("This answer needs more depth. ");

        if (!matched.isEmpty()) {
            sb.append("Concepts you covered: ").append(String.join(", ", first(matched, 5))).append(". ");
        }
        if (!missing.isEmpty()) {
            sb.append("Try to also mention: ").append(String.join(", ", first(missing, 5))).append(". ");
        }
        if (words < target * 0.6) {
            sb.append("The answer was fairly short; add a definition, how it works and an example. ");
        }
        if (fillers != null && fillers >= 3) {
            sb.append("Several filler words (such as um or uh) were detected in the transcript; pause briefly instead. ");
        }
        return sb.toString().trim();
    }

    private List<String> first(List<String> list, int n) {
        return list.subList(0, Math.min(n, list.size()));
    }
}
