package backend;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

/** Starts the whole app, so it needs a running MySQL. Enable with RUN_DB_TESTS=true. */
@SpringBootTest
@EnabledIfEnvironmentVariable(named = "RUN_DB_TESTS", matches = "true")
class BackendApplicationTests {

    @Test
    void contextLoads() {
    }

}
