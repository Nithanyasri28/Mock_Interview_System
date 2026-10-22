package backend.util;

import backend.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.util.Locale;

/** Allowed values and small normalising helpers used across the backend. */
public final class Options {

    private Options() {}

    public static final String IN_PROGRESS = "IN_PROGRESS";
    public static final String COMPLETED = "COMPLETED";
    public static final String ABANDONED = "ABANDONED";

    /** Accepts Beginner/Intermediate/Advanced and the older Easy/Medium/Hard names. */
    public static String difficulty(String raw) {
        String v = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        switch (v) {
            case "BEGINNER":
            case "EASY":
                return "BEGINNER";
            case "INTERMEDIATE":
            case "MEDIUM":
                return "INTERMEDIATE";
            case "ADVANCED":
            case "HARD":
                return "ADVANCED";
            default:
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Difficulty must be Beginner, Intermediate or Advanced.");
        }
    }

    public static int difficultyRank(String difficulty) {
        if ("BEGINNER".equals(difficulty)) return 0;
        if ("ADVANCED".equals(difficulty)) return 2;
        return 1;
    }

    public static String interviewType(String raw) {
        String v = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        if (v.equals("BEHAVIOURAL")) v = "BEHAVIORAL";
        if (v.equals("TECHNICAL") || v.equals("HR") || v.equals("BEHAVIORAL") || v.equals("MIXED")) {
            return v;
        }
        throw new ApiException(HttpStatus.BAD_REQUEST,
                "Interview type must be Technical, HR, Behavioral or Mixed.");
    }

    /** SPEECH when the text came from speech recognition, otherwise TYPED. */
    public static String inputMethod(String raw) {
        String v = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        return (v.equals("SPEECH") || v.equals("SPOKEN") || v.equals("VOICE")) ? "SPEECH" : "TYPED";
    }
}
