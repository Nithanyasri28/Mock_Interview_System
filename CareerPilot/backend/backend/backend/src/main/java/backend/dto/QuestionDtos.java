package backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class QuestionDtos {

    private QuestionDtos() {}

    public record QuestionSummary(Long id, List<String> roles, String category, String topic,
                                  String difficulty, String questionText, boolean bookmarked) {
    }

    public record QuestionDetail(Long id, List<String> roles, String category, String topic,
                                 String difficulty, String questionText, List<String> keyConcepts,
                                 String referenceAnswer, boolean bookmarked) {
    }

    public record QuestionMeta(List<String> roles, List<String> topics,
                               List<String> categories, List<String> difficulties) {
    }

    public record PracticeRequest(
            @NotNull(message = "questionId is required") Long questionId,
            @NotBlank(message = "Please write or speak an answer first") @Size(max = 8000, message = "Answer is too long") String answer,
            String inputMethod) {
    }

    public record EvaluationResponse(int score, int keywordScore, int relevanceScore,
                                     int completenessScore, int clarityScore, Integer fillerWordCount,
                                     List<String> matchedKeywords, List<String> missingKeywords,
                                     String feedback, String referenceAnswer,
                                     String evaluationMethod, String evaluationNote) {
    }
}
