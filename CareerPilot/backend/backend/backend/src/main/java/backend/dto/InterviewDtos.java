package backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class InterviewDtos {

    private InterviewDtos() {}

    public record CreateInterviewRequest(
            @NotBlank(message = "Role is required") @Size(max = 100) String role,
            @NotBlank(message = "Difficulty is required") String difficulty,
            @NotBlank(message = "Interview type is required") String interviewType,
            @Min(value = 1, message = "Choose at least 1 question") @Max(value = 30, message = "Choose at most 30 questions") int questionCount,
            @Min(value = 15, message = "Minimum time is 15 seconds") @Max(value = 600, message = "Maximum time is 600 seconds") int timePerQuestionSeconds,
            List<String> focusTopics) {
    }

    public record SubmitAnswerRequest(
            @Size(max = 8000, message = "Answer is too long") String answerText,
            String inputMethod,
            Integer timeTakenSeconds) {
    }

    public record AnswerSubmission(
            @NotNull(message = "order is required") Integer order,
            @Size(max = 8000, message = "Answer is too long") String answerText,
            String inputMethod,
            Integer timeTakenSeconds) {
    }

    /** Optional body of POST /complete. Lets the frontend send all answers in one request. */
    public record CompleteRequest(Boolean endedEarly, @Valid List<AnswerSubmission> answers) {
    }

    public record AnswerSaved(int order, boolean answered) {
    }

    public record InterviewSummary(Long id, String role, String difficulty, String interviewType,
                                   int questionCount, int timePerQuestionSeconds, List<String> focusTopics,
                                   String status, Instant startedAt, Instant completedAt,
                                   Integer overallScore, int answeredCount, boolean endedEarly) {
    }

    /** A question as shown during an interview. Keywords and reference answers are NOT included. */
    public record QuestionPayload(int order, Long questionId, String questionText, String category,
                                  String topic, String difficulty, boolean answered,
                                  String savedAnswer, String inputMethod) {
    }

    public record InterviewSession(InterviewSummary interview, List<QuestionPayload> questions, String warning) {
    }

    public record AnswerResult(int order, Long questionId, String questionText, String topic, String category,
                               boolean answered, String answerText, String inputMethod, Integer timeTakenSeconds,
                               int score, int keywordScore, int relevanceScore, int completenessScore,
                               int clarityScore, Integer fillerWordCount, List<String> matchedKeywords,
                               List<String> missingKeywords, String feedback, String referenceAnswer) {
    }

    public record MissingConcept(String topic, String concept) {
    }

    public record InterviewResult(InterviewSummary interview, String evaluationMethod, String evaluationNote,
                                  int overallScore, int answeredCount, int totalQuestions,
                                  List<AnswerResult> answers, List<String> strengths,
                                  List<String> improvements, List<MissingConcept> missingConcepts,
                                  List<String> recommendedTopics, String summary) {
    }

    /** questions is set for IN_PROGRESS interviews, result for COMPLETED ones. */
    public record InterviewDetail(InterviewSummary interview, List<QuestionPayload> questions, InterviewResult result) {
    }
}
