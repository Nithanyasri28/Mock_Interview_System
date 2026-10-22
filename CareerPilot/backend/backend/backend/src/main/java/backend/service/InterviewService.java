package backend.service;

import backend.dto.InterviewDtos.*;
import backend.entity.Interview;
import backend.entity.InterviewAnswer;
import backend.entity.Question;
import backend.entity.User;
import backend.exception.ApiException;
import backend.repository.InterviewRepository;
import backend.util.Options;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/** Creating interviews, saving answers, scoring and returning results. Every lookup is owner-scoped. */
@Service
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final QuestionService questionService;
    private final EvaluationService evaluationService;
    private final ResultAnalyzer resultAnalyzer;
    private final EmailService emailService;

    public InterviewService(InterviewRepository interviewRepository, QuestionService questionService,
                            EvaluationService evaluationService, ResultAnalyzer resultAnalyzer,
                            EmailService emailService) {
        this.interviewRepository = interviewRepository;
        this.questionService = questionService;
        this.evaluationService = evaluationService;
        this.resultAnalyzer = resultAnalyzer;
        this.emailService = emailService;
    }

    // ------------------------------------------------------------------ create

    @Transactional
    public InterviewSession create(User user, CreateInterviewRequest req) {
        String difficulty = Options.difficulty(req.difficulty());
        String type = Options.interviewType(req.interviewType());
        String role = req.role().trim();
        List<String> focus = cleanFocus(req.focusTopics());

        // A user has at most one active interview: starting a new one abandons the old one.
        for (Interview old : interviewRepository.findByUserIdAndStatus(user.getId(), Options.IN_PROGRESS)) {
            old.setStatus(Options.ABANDONED);
        }

        List<Question> picked = questionService.pickQuestions(role, difficulty, type,
                req.questionCount(), focus, recentQuestionIds(user.getId()));
        if (picked.isEmpty()) {
            throw new ApiException(HttpStatus.valueOf(422),
                    "No questions are available for this role and interview type yet.");
        }

        Interview iv = new Interview();
        iv.setUser(user);
        iv.setRole(role);
        iv.setDifficulty(difficulty);
        iv.setInterviewType(type);
        iv.setQuestionCount(picked.size());
        iv.setTimePerQuestionSeconds(req.timePerQuestionSeconds());
        iv.setFocusTopics(focus.isEmpty() ? null : String.join(",", focus));
        iv.setStatus(Options.IN_PROGRESS);
        iv.setStartedAt(Instant.now());

        int order = 1;
        for (Question q : picked) {
            InterviewAnswer a = new InterviewAnswer();
            a.setInterview(iv);
            a.setQuestionOrder(order++);
            a.setQuestionId(q.getId());
            a.setCategory(q.getCategory());
            a.setTopic(q.getTopic());
            a.setDifficulty(q.getDifficulty());
            a.setQuestionText(q.getQuestionText());
            a.setKeywords(q.getKeywords());
            a.setReferenceAnswer(q.getReferenceAnswer());
            a.setAnswered(false);
            iv.getAnswers().add(a);
        }
        interviewRepository.save(iv);

        String warning = picked.size() < req.questionCount()
                ? "Only " + picked.size() + " question(s) are available for these settings, so the interview was created with " + picked.size() + "."
                : null;
        return new InterviewSession(toSummary(iv), toQuestions(iv), warning);
    }

    // ------------------------------------------------------------------ answers

    @Transactional
    public AnswerSaved saveAnswer(User user, Long interviewId, int order, SubmitAnswerRequest req) {
        Interview iv = requireOwned(user, interviewId);
        requireInProgress(iv);
        InterviewAnswer a = findAnswer(iv, order);
        applyAnswer(a, iv, req.answerText(), req.inputMethod(), req.timeTakenSeconds());
        interviewRepository.save(iv);
        return new AnswerSaved(order, a.isAnswered());
    }

    @Transactional
    public InterviewResult complete(User user, Long interviewId, CompleteRequest req) {
        Interview iv = requireOwned(user, interviewId);
        if (Options.COMPLETED.equals(iv.getStatus())) {
            return buildResult(iv); // idempotent
        }
        requireInProgress(iv);

        if (req != null && req.answers() != null) {
            for (AnswerSubmission s : req.answers()) {
                applyAnswer(findAnswer(iv, s.order()), iv, s.answerText(), s.inputMethod(), s.timeTakenSeconds());
            }
        }

        int sum = 0;
        for (InterviewAnswer a : iv.getAnswers()) {
            if (!a.isAnswered()) markUnanswered(a);
            sum += a.getScore() == null ? 0 : a.getScore();
        }
        int total = Math.max(1, iv.getAnswers().size());
        iv.setOverallScore(Math.round((float) sum / total)); // unanswered questions count as 0
        iv.setStatus(Options.COMPLETED);
        iv.setCompletedAt(Instant.now());
        iv.setEndedEarly(req != null && Boolean.TRUE.equals(req.endedEarly()));
        iv.setEvaluationMethod(EvaluationService.METHOD);
        interviewRepository.save(iv);

        InterviewResult result = buildResult(iv);
        emailService.sendInterviewSummary(user.getEmail(), user.getName(), iv.getRole(), iv.getInterviewType(),
                result.overallScore(), result.answeredCount(), result.totalQuestions(), result.recommendedTopics());
        return result;
    }

    // -------------------------------------------------------------------- reads

    @Transactional(readOnly = true)
    public InterviewDetail get(User user, Long id) {
        Interview iv = requireOwned(user, id);
        if (Options.COMPLETED.equals(iv.getStatus())) {
            return new InterviewDetail(toSummary(iv), null, buildResult(iv));
        }
        return new InterviewDetail(toSummary(iv), toQuestions(iv), null);
    }

    @Transactional(readOnly = true)
    public Optional<InterviewSession> active(User user) {
        return interviewRepository
                .findFirstByUserIdAndStatusOrderByStartedAtDesc(user.getId(), Options.IN_PROGRESS)
                .map(iv -> new InterviewSession(toSummary(iv), toQuestions(iv), null));
    }

    @Transactional(readOnly = true)
    public List<InterviewSummary> list(User user, String status, String search, String role,
                                       String type, String difficulty, String sort, String order) {
        String wantedStatus = isBlank(status) ? Options.COMPLETED : status.trim().toUpperCase(Locale.ROOT);
        String wantedDifficulty = isBlank(difficulty) ? null : Options.difficulty(difficulty);
        String term = isBlank(search) ? null : search.trim().toLowerCase(Locale.ROOT);

        List<InterviewSummary> rows = new ArrayList<>();
        for (Interview iv : interviewRepository.findByUserIdOrderByStartedAtDesc(user.getId())) {
            if (!iv.getStatus().equals(wantedStatus)) continue;
            if (!isBlank(role) && !iv.getRole().equalsIgnoreCase(role.trim())) continue;
            if (!isBlank(type) && !iv.getInterviewType().equalsIgnoreCase(Options.interviewType(type))) continue;
            if (wantedDifficulty != null && !wantedDifficulty.equals(iv.getDifficulty())) continue;
            if (term != null) {
                String haystack = (iv.getRole() + " " + iv.getInterviewType() + " " + iv.getDifficulty())
                        .toLowerCase(Locale.ROOT);
                if (!haystack.contains(term)) continue;
            }
            rows.add(toSummary(iv));
        }

        Comparator<InterviewSummary> cmp;
        if ("score".equalsIgnoreCase(sort)) {
            cmp = Comparator.comparing((InterviewSummary s) -> s.overallScore(),
                    Comparator.nullsFirst(Comparator.<Integer>naturalOrder()));
        } else {
            cmp = Comparator.comparing((InterviewSummary s) -> s.startedAt());
        }
        if (!"asc".equalsIgnoreCase(order)) cmp = cmp.reversed();
        rows.sort(cmp);
        return rows;
    }

    @Transactional
    public void delete(User user, Long id) {
        interviewRepository.delete(requireOwned(user, id));
    }

    // ------------------------------------------------------------------ mapping

    public InterviewSummary toSummary(Interview iv) {
        int answered = 0;
        for (InterviewAnswer a : iv.getAnswers()) {
            if (a.isAnswered()) answered++;
        }
        List<String> focus = new ArrayList<>();
        if (iv.getFocusTopics() != null && !iv.getFocusTopics().isBlank()) {
            focus.addAll(Arrays.asList(iv.getFocusTopics().split(",")));
        }
        return new InterviewSummary(iv.getId(), iv.getRole(), iv.getDifficulty(), iv.getInterviewType(),
                iv.getQuestionCount(), iv.getTimePerQuestionSeconds(), focus, iv.getStatus(),
                iv.getStartedAt(), iv.getCompletedAt(), iv.getOverallScore(), answered, iv.isEndedEarly());
    }

    private List<QuestionPayload> toQuestions(Interview iv) {
        List<QuestionPayload> out = new ArrayList<>();
        for (InterviewAnswer a : iv.getAnswers()) {
            out.add(new QuestionPayload(a.getQuestionOrder(), a.getQuestionId(), a.getQuestionText(),
                    a.getCategory(), a.getTopic(), a.getDifficulty(), a.isAnswered(),
                    a.getAnswerText(), a.getInputMethod()));
        }
        return out;
    }

    private InterviewResult buildResult(Interview iv) {
        List<InterviewAnswer> answers = iv.getAnswers();
        List<AnswerResult> rows = new ArrayList<>();
        int answered = 0;
        for (InterviewAnswer a : answers) {
            if (a.isAnswered()) answered++;
            rows.add(new AnswerResult(a.getQuestionOrder(), a.getQuestionId(), a.getQuestionText(),
                    a.getTopic(), a.getCategory(), a.isAnswered(), a.getAnswerText(), a.getInputMethod(),
                    a.getTimeTakenSeconds(), nz(a.getScore()), nz(a.getKeywordScore()),
                    nz(a.getRelevanceScore()), nz(a.getCompletenessScore()), nz(a.getClarityScore()),
                    a.getFillerWordCount(), split(a.getMatchedKeywords()), split(a.getMissingKeywords()),
                    a.getFeedback(), a.getReferenceAnswer()));
        }
        int overall = nz(iv.getOverallScore());
        ResultAnalyzer.Insights ins = resultAnalyzer.insights(answers, overall, answered, answers.size());
        return new InterviewResult(toSummary(iv), EvaluationService.METHOD, EvaluationService.NOTE, overall,
                answered, answers.size(), rows, ins.strengths(), ins.improvements(), ins.missingConcepts(),
                ins.recommendedTopics(), ins.summary());
    }

    // ------------------------------------------------------------------ helpers

    private Interview requireOwned(User user, Long id) {
        return interviewRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Interview not found."));
    }

    private void requireInProgress(Interview iv) {
        if (!Options.IN_PROGRESS.equals(iv.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "This interview is no longer in progress.");
        }
    }

    private InterviewAnswer findAnswer(Interview iv, int order) {
        for (InterviewAnswer a : iv.getAnswers()) {
            if (a.getQuestionOrder() == order) return a;
        }
        throw new ApiException(HttpStatus.NOT_FOUND, "Question " + order + " does not exist in this interview.");
    }

    private void applyAnswer(InterviewAnswer a, Interview iv, String text, String inputMethod, Integer timeTaken) {
        String trimmed = text == null ? "" : text.trim();
        if (trimmed.isEmpty()) {
            a.setAnswered(false);
            a.setAnswerText(null);
            a.setInputMethod(null);
            a.setTimeTakenSeconds(null);
            a.setScore(null);
            a.setKeywordScore(null);
            a.setRelevanceScore(null);
            a.setCompletenessScore(null);
            a.setClarityScore(null);
            a.setFillerWordCount(null);
            a.setMatchedKeywords(null);
            a.setMissingKeywords(null);
            a.setFeedback(null);
            return;
        }
        a.setAnswered(true);
        a.setAnswerText(trimmed);
        a.setInputMethod(Options.inputMethod(inputMethod));
        a.setTimeTakenSeconds(timeTaken == null ? null : Math.max(0, Math.min(timeTaken, 3600)));

        EvaluationService.Result r = evaluationService.evaluate(a.getQuestionText(), trimmed, a.getKeywords(),
                a.getReferenceAnswer(), a.getDifficulty(), a.getInputMethod());
        a.setScore(r.score());
        a.setKeywordScore(r.keywordScore());
        a.setRelevanceScore(r.relevanceScore());
        a.setCompletenessScore(r.completenessScore());
        a.setClarityScore(r.clarityScore());
        a.setFillerWordCount(r.fillerWordCount());
        a.setMatchedKeywords(String.join(";", r.matched()));
        a.setMissingKeywords(String.join(";", r.missing()));
        a.setFeedback(r.feedback());
    }

    private void markUnanswered(InterviewAnswer a) {
        a.setAnswered(false);
        a.setInputMethod("NONE");
        a.setScore(0);
        a.setKeywordScore(0);
        a.setRelevanceScore(0);
        a.setCompletenessScore(0);
        a.setClarityScore(0);
        a.setFillerWordCount(null);
        a.setMatchedKeywords("");
        a.setMissingKeywords(String.join(";", evaluationService.keywordDisplayNames(a.getKeywords())));
        a.setFeedback("No answer was submitted for this question.");
    }

    /** Question ids from the user's three most recent interviews, so new interviews prefer fresh questions. */
    private Set<Long> recentQuestionIds(Long userId) {
        Set<Long> ids = new HashSet<>();
        List<Interview> recent = interviewRepository.findByUserIdOrderByStartedAtDesc(userId);
        for (int i = 0; i < Math.min(3, recent.size()); i++) {
            for (InterviewAnswer a : recent.get(i).getAnswers()) {
                if (a.getQuestionId() != null) ids.add(a.getQuestionId());
            }
        }
        return ids;
    }

    private List<String> cleanFocus(List<String> raw) {
        List<String> out = new ArrayList<>();
        if (raw == null) return out;
        for (String f : raw) {
            if (f != null && !f.isBlank() && out.size() < 10) {
                String t = f.trim();
                out.add(t.length() > 50 ? t.substring(0, 50) : t);
            }
        }
        return out;
    }

    private List<String> split(String s) {
        List<String> out = new ArrayList<>();
        if (s == null || s.isBlank()) return out;
        for (String p : s.split(";")) {
            if (!p.isBlank()) out.add(p.trim());
        }
        return out;
    }

    private int nz(Integer v) {
        return v == null ? 0 : v;
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
