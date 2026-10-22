package backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** Plain unit tests: no Spring context and no database needed. */
class EvaluationServiceTest {

    private final EvaluationService service = new EvaluationService();

    private static final String QUESTION = "What is the JVM?";
    private static final String KEYWORDS = "jvm;bytecode;platform independent/portable";
    private static final String REFERENCE = "The JVM runs Java bytecode, which makes Java programs portable across platforms.";

    @Test
    void emptyAnswerScoresZero() {
        EvaluationService.Result r = service.evaluate(QUESTION, "   ", KEYWORDS, REFERENCE, "BEGINNER", "TYPED");
        assertEquals(0, r.score());
        assertEquals(3, r.missing().size());
    }

    @Test
    void goodAnswerScoresHigh() {
        String answer = "The JVM is the Java Virtual Machine. It loads compiled Java bytecode and runs it on the "
                + "current machine, so the same program is portable across operating systems. For example, "
                + "you compile once with javac and the JVM on Windows or Linux executes the bytecode, which "
                + "also manages memory using garbage collection.";
        EvaluationService.Result r = service.evaluate(QUESTION, answer, KEYWORDS, REFERENCE, "BEGINNER", "TYPED");
        assertEquals(3, r.matched().size());
        assertTrue(r.score() >= 70, "expected a high score but got " + r.score());
    }

    @Test
    void keywordOnlyAnswerIsCapped() {
        EvaluationService.Result r = service.evaluate(QUESTION, "jvm bytecode portable", KEYWORDS, REFERENCE,
                "BEGINNER", "TYPED");
        assertTrue(r.score() <= 25, "short answers must be capped but got " + r.score());
    }

    @Test
    void fillerWordsOnlyCountedForSpeech() {
        String answer = "Um the JVM is uh basically the machine that runs Java bytecode and it makes programs portable "
                + "across different systems because the same bytecode works everywhere.";
        EvaluationService.Result typed = service.evaluate(QUESTION, answer, KEYWORDS, REFERENCE, "BEGINNER", "TYPED");
        EvaluationService.Result spoken = service.evaluate(QUESTION, answer, KEYWORDS, REFERENCE, "BEGINNER", "SPEECH");
        assertNull(typed.fillerWordCount());
        assertTrue(spoken.fillerWordCount() >= 3);
    }
}
