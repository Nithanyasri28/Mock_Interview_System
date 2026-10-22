package backend.dto;

import backend.dto.InterviewDtos.InterviewSummary;

import java.time.Instant;
import java.util.List;

public final class AnalyticsDtos {

    private AnalyticsDtos() {}

    public record ScorePoint(Long interviewId, Instant date, int score, String role,
                             String interviewType, String difficulty) {
    }

    public record TopicStat(String topic, int averageScore, int questionsAnswered, boolean sufficientData) {
    }

    public record CategoryAverage(String label, int averageScore, int interviews) {
    }

    public record Comparison(int latestScore, int previousScore, int change, Long latestInterviewId) {
    }

    /** averageScore and bestScore are null until the user completes an interview (no fake numbers). */
    public record DashboardResponse(String userName, int totalInterviews, Integer averageScore,
                                    Integer bestScore, List<InterviewSummary> recentInterviews,
                                    List<ScorePoint> scoreTrend, List<String> recommendedTopics,
                                    Long activeInterviewId) {
    }

    public record AnalyticsResponse(int totalInterviews, List<ScorePoint> scoreTrend,
                                    List<CategoryAverage> byInterviewType, List<CategoryAverage> byRole,
                                    List<TopicStat> topics, List<TopicStat> strengths,
                                    List<TopicStat> weakAreas, Comparison comparison,
                                    List<String> recommendations, String note) {
    }
}
