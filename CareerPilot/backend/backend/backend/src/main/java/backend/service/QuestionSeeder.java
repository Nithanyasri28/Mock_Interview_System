package backend.service;

import backend.entity.Question;
import backend.repository.QuestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Loads src/main/resources/questions.txt into the database at startup.
 * Only questions whose text is not already stored are inserted, so existing data is never changed.
 *
 * Line format:  roles|category|topic|difficulty|question|keywords|reference answer
 * Role aliases: @SERVER = Java/Backend/Full Stack, @FRONT = Frontend/Full Stack, @DATA = Data Analyst, @ALL = every role.
 */
@Component
public class QuestionSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(QuestionSeeder.class);

    private final QuestionRepository questionRepository;

    public QuestionSeeder(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        int added = 0;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource("questions.txt").getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                String[] p = line.split("\\|", -1);
                if (p.length < 7) {
                    log.warn("Skipping malformed question line: {}", line.substring(0, Math.min(40, line.length())));
                    continue;
                }
                String text = p[4].trim();
                if (questionRepository.existsByQuestionText(text)) continue;

                Question q = new Question();
                q.setRoles(expandRoles(p[0]));
                q.setCategory(p[1].trim().toUpperCase());
                q.setTopic(p[2].trim());
                q.setDifficulty(p[3].trim().toUpperCase());
                q.setQuestionText(text);
                q.setKeywords(p[5].trim());
                q.setReferenceAnswer(p[6].trim());
                questionRepository.save(q);
                added++;
            }
        }
        log.info("Question bank ready: {} new question(s) added, {} total.", added, questionRepository.count());
    }

    private String expandRoles(String raw) {
        Set<String> roles = new LinkedHashSet<>();
        for (String token : raw.split(";")) {
            String t = token.trim();
            if (t.equals("@SERVER")) {
                roles.add("Java Developer");
                roles.add("Backend Developer");
                roles.add("Full Stack Developer");
            } else if (t.equals("@FRONT")) {
                roles.add("Frontend Developer");
                roles.add("Full Stack Developer");
            } else if (t.equals("@DATA")) {
                roles.add("Data Analyst");
            } else if (t.equals("@ALL")) {
                roles.add("ALL");
            } else if (!t.isEmpty()) {
                roles.add(t);
            }
        }
        return String.join(",", roles);
    }
}
