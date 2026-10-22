package backend.service;

import backend.dto.AnalyticsDtos.*;
import backend.dto.InterviewDtos.InterviewSummary;
import backend.entity.Interview;
import backend.entity.User;
import backend.repository.InterviewAnswerRepository;
import backend.repository.InterviewRepository;
import backend.util.Options;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Dashboard and performance numbers. Everything is calculated from the user's saved interviews. */
@Service
public class AnalyticsService {

    private final InterviewRepository interviewRepository;
    private final InterviewAnswerRepository answerRepository;
    private final InterviewService interviewService;
    private final ResultAnalyzer resultAnalyzer;

    public AnalyticsService(InterviewRepository interviewRepository, InterviewAnswerRepository answerRepository,
                            InterviewService interviewService, ResultAnalyzer resultAnalyzer) {
        this.interviewRepository = interviewRepository;
        this.answerRepository = answerRepository;
        this.interviewService = interviewService;
        this.resultAnalyzer = resultAnalyzer;
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard(User user) {
        List<Interview> completed = completed(user);
        List<ScorePoint> trend = trend(completed);

        Integer average = null;
        Integer best = null;
        if (!trend.isEmpty()) {
            int sum = 0;
            int max = 0;
            for (ScorePoint p : trend) {
                sum += p.score();
                max = Math.max(max, p.score());
            }
            average = Math.round((float) sum / trend.size());
            best = max;
        }

        List<InterviewSummary> recent = new ArrayList<>();
        for (int i = completed.size() - 1; i >= 0 && recent.size() < 5; i--) {
            recent.add(interviewService.toSummary(completed.get(i)));
        }

        List<String> recommended = new ArrayList<>();
        for (ResultAnalyzer.TopicScore t : topics(user)) {
            if (t.average() < 70 && recommended.size() < 5) recommended.add(t.topic());
        }

        List<ScorePoint> lastTen = trend.subList(Math.max(0, trend.size() - 10), trend.size());
        Long activeId = interviewService.active(user).map(s -> s.interview().id()).orElse(null);

        return new DashboardResponse(user.getName(), completed.size(), average, best, recent,
                new ArrayList<>(lastTen), recommended, activeId);
    }

    @Transactional(readOnly = true)
    public AnalyticsResponse analytics(User user) {
        List<Interview> completed = completed(user);
        List<ScorePoint> trend = trend(completed);

        List<CategoryAverage> byType = group(completed, true);
        List<CategoryAverage> byRole = group(completed, false);

        List<TopicStat> topicStats = new ArrayList<>();
        List<TopicStat> strengths = new ArrayList<>();
        List<TopicStat> weak = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();
        for (ResultAnalyzer.TopicScore t : topics(user)) {
            TopicStat stat = new TopicStat(t.topic(), t.average(), t.count(), t.count() >= 3);
            topicStats.add(stat);
            if (t.average() >= 70 && t.count() >= 2) strengths.add(stat);
            if (t.average() < 60) {
                weak.add(stat);
                recommendations.add("Review " + t.topic() + ": your average is " + t.average() + "% across "
                        + t.count() + " answered question" + (t.count() == 1 ? "" : "s") + ".");
            }
        }

        Comparison comparison = null;
        if (trend.size() >= 2) {
            ScorePoint latest = trend.get(trend.size() - 1);
            ScorePoint previous = trend.get(trend.size() - 2);
            comparison = new Comparison(latest.score(), previous.score(),
                    latest.score() - previous.score(), latest.interviewId());
        }

        String note = completed.isEmpty()
                ? "Complete an interview to see your performance analytics."
                : (completed.size() < 3
                ? "Only " + completed.size() + " completed interview(s) so far. Trends become more reliable after a few more."
                : "Based on " + completed.size() + " completed interviews. Scores use rule-based keyword evaluation, not AI.");

        return new AnalyticsResponse(completed.size(), trend, byType, byRole, topicStats, strengths, weak,
                comparison, recommendations, note);
    }

    // ----------------------------------------------------------------- helpers

    private List<Interview> completed(User user) {
        List<Interview> out = new ArrayList<>();
        for (Interview iv : interviewRepository.findByUserIdAndStatusOrderByCompletedAtAsc(user.getId(), Options.COMPLETED)) {
            if (iv.getOverallScore() != null) out.add(iv);
        }
        return out;
    }

    private List<ScorePoint> trend(List<Interview> completed) {
        List<ScorePoint> out = new ArrayList<>();
        for (Interview iv : completed) {
            out.add(new ScorePoint(iv.getId(), iv.getCompletedAt(), iv.getOverallScore(),
                    iv.getRole(), iv.getInterviewType(), iv.getDifficulty()));
        }
        return out;
    }

    private List<ResultAnalyzer.TopicScore> topics(User user) {
        return resultAnalyzer.topicScores(answerRepository.findCompletedAnswersForUser(user.getId()));
    }

    private List<CategoryAverage> group(List<Interview> completed, boolean byType) {
        Map<String, int[]> acc = new LinkedHashMap<>();
        for (Interview iv : completed) {
            String key = byType ? iv.getInterviewType() : iv.getRole();
            int[] v = acc.computeIfAbsent(key, k -> new int[2]);
            v[0] += iv.getOverallScore();
            v[1]++;
        }
        List<CategoryAverage> out = new ArrayList<>();
        for (Map.Entry<String, int[]> e : acc.entrySet()) {
            out.add(new CategoryAverage(e.getKey(), Math.round((float) e.getValue()[0] / e.getValue()[1]), e.getValue()[1]));
        }
        return out;
    }
}
