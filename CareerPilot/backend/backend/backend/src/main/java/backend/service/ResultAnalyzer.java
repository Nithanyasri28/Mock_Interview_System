package backend.service;

import backend.dto.InterviewDtos.MissingConcept;
import backend.entity.InterviewAnswer;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Builds strengths, weaknesses and study suggestions from real saved answers. */
@Component
public class ResultAnalyzer {

    public record TopicScore(String topic, int average, int count) {
    }

    public record Insights(List<String> strengths, List<String> improvements,
                           List<MissingConcept> missingConcepts, List<String> recommendedTopics,
                           String summary) {
    }

    /** Average score per topic over ANSWERED questions only, lowest first. */
    public List<TopicScore> topicScores(Collection<InterviewAnswer> answers) {
        Map<String, int[]> acc = new LinkedHashMap<>();
        for (InterviewAnswer a : answers) {
            if (!a.isAnswered() || a.getScore() == null) continue;
            String topic = a.getTopic() == null ? "General" : a.getTopic();
            int[] v = acc.computeIfAbsent(topic, k -> new int[2]);
            v[0] += a.getScore();
            v[1]++;
        }
        List<TopicScore> out = new ArrayList<>();
        for (Map.Entry<String, int[]> e : acc.entrySet()) {
            int[] v = e.getValue();
            out.add(new TopicScore(e.getKey(), Math.round((float) v[0] / v[1]), v[1]));
        }
        out.sort(Comparator.comparingInt(TopicScore::average));
        return out;
    }

    public Insights insights(List<InterviewAnswer> answers, int overall, int answeredCount, int total) {
        List<TopicScore> topics = topicScores(answers);

        List<String> strengths = new ArrayList<>();
        List<String> improvements = new ArrayList<>();
        for (TopicScore t : topics) {
            if (t.average() >= 70) {
                strengths.add("Strong on " + t.topic() + " (average " + t.average() + "%)");
            } else if (t.average() < 60) {
                improvements.add("Needs more work on " + t.topic() + " (average " + t.average() + "%)");
            }
        }

        int unanswered = total - answeredCount;
        if (unanswered > 0) {
            improvements.add(unanswered + " question" + (unanswered == 1 ? " was" : "s were") + " left unanswered");
        }

        int wordSum = 0;
        int fillerSum = 0;
        for (InterviewAnswer a : answers) {
            if (!a.isAnswered() || a.getAnswerText() == null) continue;
            wordSum += a.getAnswerText().trim().split("\\s+").length;
            if (a.getFillerWordCount() != null) fillerSum += a.getFillerWordCount();
        }
        if (answeredCount > 0 && (double) wordSum / answeredCount < 25) {
            improvements.add("Your answers were short on average; aim for a definition, an explanation and an example");
        }
        if (fillerSum >= 5) {
            improvements.add("Several filler words appeared in your spoken answers; practise pausing instead");
        }

        // weakest answered questions first
        List<InterviewAnswer> answered = new ArrayList<>();
        for (InterviewAnswer a : answers) {
            if (a.isAnswered()) answered.add(a);
        }
        answered.sort(Comparator.comparingInt(a -> a.getScore() == null ? 0 : a.getScore()));
        List<MissingConcept> missing = new ArrayList<>();
        for (InterviewAnswer a : answered) {
            if (a.getMissingKeywords() == null || a.getMissingKeywords().isBlank()) continue;
            for (String kw : Arrays.asList(a.getMissingKeywords().split(";"))) {
                if (missing.size() >= 12) break;
                if (!kw.isBlank()) missing.add(new MissingConcept(a.getTopic(), kw.trim()));
            }
        }

        Set<String> recommended = new LinkedHashSet<>();
        for (TopicScore t : topics) {
            if (t.average() < 70 && recommended.size() < 5) recommended.add(t.topic());
        }
        for (InterviewAnswer a : answers) {
            if (!a.isAnswered() && a.getTopic() != null && recommended.size() < 5) recommended.add(a.getTopic());
        }

        String summary = "You answered " + answeredCount + " of " + total + " questions. Your overall score is "
                + overall + "%. It is calculated with keyword, relevance, completeness and clarity rules, "
                + "not by an AI model.";

        return new Insights(strengths, improvements, missing, new ArrayList<>(recommended), summary);
    }
}
