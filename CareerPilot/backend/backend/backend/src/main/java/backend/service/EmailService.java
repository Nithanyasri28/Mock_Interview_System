package backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;

/** Optional e-mail. Does nothing unless MAIL_ENABLED=true and SMTP settings are configured. */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> senderProvider;
    private final boolean enabled;
    private final String from;

    public EmailService(ObjectProvider<JavaMailSender> senderProvider,
                        @Value("${app.mail.enabled:false}") boolean enabled,
                        @Value("${app.mail.from:no-reply@careerpilot.local}") String from) {
        this.senderProvider = senderProvider;
        this.enabled = enabled;
        this.from = from;
    }

    public void sendWelcome(String to, String name) {
        send(to, "Welcome to CareerPilot",
                "Hi " + name + ",\n\nYour CareerPilot account is ready. Start a mock interview whenever you like "
                        + "and review your results to see what to study next.\n\nGood luck!\nCareerPilot");
    }

    public void sendInterviewSummary(String to, String name, String role, String type,
                                     int score, int answered, int total, List<String> topics) {
        String study = topics.isEmpty() ? "Keep practising to build a longer history."
                : "Suggested topics to revise: " + String.join(", ", topics) + ".";
        send(to, "Your CareerPilot interview summary",
                "Hi " + name + ",\n\nYou completed a " + type + " interview for " + role + ".\n"
                        + "Answered " + answered + " of " + total + " questions. Score: " + score + "%.\n"
                        + "(Rule-based keyword evaluation, not AI.)\n" + study + "\n\nCareerPilot");
    }

    private void send(String to, String subject, String body) {
        if (!enabled) return;
        JavaMailSender sender = senderProvider.getIfAvailable();
        if (sender == null) return;
        CompletableFuture.runAsync(() -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(from);
                message.setTo(to);
                message.setSubject(subject);
                message.setText(body);
                sender.send(message);
            } catch (Exception e) {
                log.warn("Could not send e-mail ({}). The rest of the app is unaffected.", e.getClass().getSimpleName());
            }
        });
    }
}
