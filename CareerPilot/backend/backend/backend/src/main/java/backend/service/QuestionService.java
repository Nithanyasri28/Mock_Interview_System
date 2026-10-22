package backend.service;

import backend.dto.QuestionDtos.EvaluationResponse;
import backend.dto.QuestionDtos.PracticeRequest;
import backend.dto.QuestionDtos.QuestionDetail;
import backend.dto.QuestionDtos.QuestionMeta;
import backend.dto.QuestionDtos.QuestionSummary;
import backend.entity.Question;
import backend.entity.User;
import backend.exception.ApiException;
import backend.repository.BookmarkRepository;
import backend.repository.QuestionRepository;
import backend.util.Options;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;

/** Question bank browsing, interview question selection and practice-mode evaluation. */
@Service
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final BookmarkRepository bookmarkRepository;
    private final EvaluationService evaluationService;

    public QuestionService(QuestionRepository questionRepository, BookmarkRepository bookmarkRepository,
                           EvaluationService evaluationService) {
        this.questionRepository = questionRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.evaluationService = evaluationService;
    }

    // ------------------------------------------------------------ question bank

    @Transactional(readOnly = true)
    public List<QuestionSummary> search(User user, String role, String topic, String category,
                                        String difficulty, String search) {
        Set<Long> bookmarked = new HashSet<>(bookmarkRepository.findQuestionIdsByUserId(user.getId()));
        String wantedDifficulty = isBlank(difficulty) ? null : Options.difficulty(difficulty);
        String term = isBlank(search) ? null : search.trim().toLowerCase(Locale.ROOT);

        List<QuestionSummary> out = new ArrayList<>();
        for (Question q : questionRepository.findAll()) {
            if (!isBlank(role) && !roleMatches(q, role.trim())) continue;
            if (!isBlank(topic) && !topic.trim().equalsIgnoreCase(q.getTopic())) continue;
            if (!isBlank(category) && !category.trim().equalsIgnoreCase(q.getCategory())) continue;
            if (wantedDifficulty != null && !wantedDifficulty.equals(q.getDifficulty())) continue;
            if (term != null && !(q.getQuestionText().toLowerCase(Locale.ROOT).contains(term)
                    || (q.getTopic() != null && q.getTopic().toLowerCase(Locale.ROOT).contains(term)))) continue;
            out.add(toSummary(q, bookmarked.contains(q.getId())));
        }
        out.sort(Comparator.comparing((QuestionSummary s) -> s.topic() == null ? "" : s.topic())
                .thenComparing(s -> Options.difficultyRank(s.difficulty()))
                .thenComparing(QuestionSummary::id));
        return out;
    }

    @Transactional(readOnly = true)
    public QuestionDetail detail(User user, Long id) {
        Question q = require(id);
        boolean bookmarked = bookmarkRepository.findByUserIdAndQuestionId(user.getId(), id).isPresent();
        return toDetail(q, bookmarked);
    }

    @Transactional(readOnly = true)
    public QuestionMeta meta() {
        Set<String> roles = new TreeSet<>();
        Set<String> topics = new TreeSet<>();
        for (Question q : questionRepository.findAll()) {
            roles.addAll(rolesOf(q));
            if (q.getTopic() != null) topics.add(q.getTopic());
        }
        roles.remove("ALL");
        return new QuestionMeta(new ArrayList<>(roles), new ArrayList<>(topics),
                List.of("TECHNICAL", "HR", "BEHAVIORAL"), List.of("BEGINNER", "INTERMEDIATE", "ADVANCED"));
    }

    // ---------------------------------------------------------- practice mode

    /** Evaluates a single answer without saving anything. */
    @Transactional(readOnly = true)
    public EvaluationResponse evaluatePractice(PracticeRequest request) {
        Question q = require(request.questionId());
        EvaluationService.Result r = evaluationService.evaluate(q.getQuestionText(), request.answer(),
                q.getKeywords(), q.getReferenceAnswer(), q.getDifficulty(),
                Options.inputMethod(request.inputMethod()));
        return new EvaluationResponse(r.score(), r.keywordScore(), r.relevanceScore(), r.completenessScore(),
                r.clarityScore(), r.fillerWordCount(), r.matched(), r.missing(), r.feedback(),
                q.getReferenceAnswer(), EvaluationService.METHOD, EvaluationService.NOTE);
    }

    // -------------------------------------------------- interview selection

    /**
     * Picks questions for an interview. Preference order: matching focus topic, then closest difficulty,
     * then questions the user did not see recently. Never returns the same question twice.
     */
    @Transactional(readOnly = true)
    public List<Question> pickQuestions(String role, String difficulty, String type, int count,
                                        List<String> focus, Set<Long> recentIds) {
        List<Question> all = questionRepository.findAll();
        List<Question> technical = new ArrayList<>();
        List<Question> hr = new ArrayList<>();
        List<Question> behavioral = new ArrayList<>();
        for (Question q : all) {
            if ("TECHNICAL".equals(q.getCategory())) {
                if (roleMatches(q, role)) technical.add(q);
            } else if ("HR".equals(q.getCategory())) {
                hr.add(q);
            } else if ("BEHAVIORAL".equals(q.getCategory())) {
                behavioral.add(q);
            }
        }

        Set<Long> used = new HashSet<>();
        List<Question> hrPart = new ArrayList<>();
        List<Question> techPart = new ArrayList<>();
        List<Question> behPart = new ArrayList<>();

        if ("TECHNICAL".equals(type)) {
            techPart = take(technical, count, difficulty, focus, recentIds, used);
        } else if ("HR".equals(type)) {
            hrPart = take(hr, count, difficulty, focus, recentIds, used);
            behPart = take(behavioral, count - hrPart.size(), difficulty, focus, recentIds, used);
        } else if ("BEHAVIORAL".equals(type)) {
            behPart = take(behavioral, count, difficulty, focus, recentIds, used);
            hrPart = take(hr, count - behPart.size(), difficulty, focus, recentIds, used);
        } else { // MIXED
            int nHr = count >= 3 ? Math.max(1, Math.round(count * 0.2f)) : 0;
            int nBeh = nHr;
            int nTech = count - nHr - nBeh;
            hrPart = take(hr, nHr, difficulty, focus, recentIds, used);
            behPart = take(behavioral, nBeh, difficulty, focus, recentIds, used);
            techPart = take(technical, nTech, difficulty, focus, recentIds, used);
            int missing = count - hrPart.size() - behPart.size() - techPart.size();
            if (missing > 0) techPart.addAll(take(technical, missing, difficulty, focus, recentIds, used));
            missing = count - hrPart.size() - behPart.size() - techPart.size();
            if (missing > 0) hrPart.addAll(take(hr, missing, difficulty, focus, recentIds, used));
            missing = count - hrPart.size() - behPart.size() - techPart.size();
            if (missing > 0) behPart.addAll(take(behavioral, missing, difficulty, focus, recentIds, used));
        }

        List<Question> result = new ArrayList<>(hrPart);
        result.addAll(techPart);
        result.addAll(behPart);
        return result;
    }

    private List<Question> take(List<Question> pool, int n, String difficulty, List<String> focus,
                                Set<Long> recentIds, Set<Long> used) {
        List<Question> out = new ArrayList<>();
        if (n <= 0) return out;
        List<Question> candidates = new ArrayList<>();
        for (Question q : pool) {
            if (!used.contains(q.getId())) candidates.add(q);
        }
        Collections.shuffle(candidates);
        candidates.sort(Comparator.comparingInt((Question q) -> priority(q, difficulty, focus, recentIds)));
        for (int i = 0; i < Math.min(n, candidates.size()); i++) {
            out.add(candidates.get(i));
            used.add(candidates.get(i).getId());
        }
        return out;
    }

    /** Lower number = picked earlier. */
    private int priority(Question q, String difficulty, List<String> focus, Set<Long> recentIds) {
        int p = 0;
        if (!focus.isEmpty() && "TECHNICAL".equals(q.getCategory())) {
            boolean match = false;
            for (String f : focus) {
                if (f.equalsIgnoreCase(q.getTopic())) match = true;
            }
            if (!match) p += 100;
        }
        p += Math.abs(Options.difficultyRank(q.getDifficulty()) - Options.difficultyRank(difficulty)) * 10;
        if (recentIds.contains(q.getId())) p += 5;
        return p;
    }

    // ----------------------------------------------------------------- helpers

    public Question require(Long id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Question not found."));
    }

    public QuestionSummary toSummary(Question q, boolean bookmarked) {
        return new QuestionSummary(q.getId(), rolesOf(q), q.getCategory(), q.getTopic(),
                q.getDifficulty(), q.getQuestionText(), bookmarked);
    }

    public QuestionDetail toDetail(Question q, boolean bookmarked) {
        return new QuestionDetail(q.getId(), rolesOf(q), q.getCategory(), q.getTopic(), q.getDifficulty(),
                q.getQuestionText(), evaluationService.keywordDisplayNames(q.getKeywords()),
                q.getReferenceAnswer(), bookmarked);
    }

    private List<String> rolesOf(Question q) {
        List<String> roles = new ArrayList<>();
        if (q.getRoles() == null) return roles;
        for (String r : Arrays.asList(q.getRoles().split(","))) {
            if (!r.isBlank()) roles.add(r.trim());
        }
        return roles;
    }

    private boolean roleMatches(Question q, String role) {
        List<String> roles = rolesOf(q);
        if (roles.isEmpty()) return true;
        for (String r : roles) {
            if (r.equalsIgnoreCase("ALL") || r.equalsIgnoreCase(role)) return true;
        }
        return false;
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
