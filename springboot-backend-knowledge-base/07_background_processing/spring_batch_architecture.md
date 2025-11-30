# Spring Batch Architecture

## 1. When to use Spring Batch?

- **`@Async`**: Fire and forget. "Send email". If it fails, maybe retry once.
- **Spring Batch**: "Process 1 million records from CSV to Database".
    - Needs **Transaction Management**.
    - Needs **Restartability** (If it crashes at record 500,000, resume from 500,001).
    - Needs **Chunking** (Commit every 100 records).

---

## 2. Core Concepts

### The Job
The entire workflow. "End of Day Report".

### The Step
A phase in the job. "Import CSV", "Calculate Stats", "Generate PDF".

### The Chunk Model (Read-Process-Write)
Spring Batch doesn't read 1 million rows into RAM. It reads in chunks.

1.  **ItemReader**: Reads 10 items.
2.  **ItemProcessor**: Processes 10 items (Business Logic).
3.  **ItemWriter**: Writes 10 items (INSERT into DB).
4.  **Commit Transaction**.
5.  Repeat.

---

## 3. Implementation

### Configuration
```java
@Configuration
@EnableBatchProcessing
public class BatchConfig {

    @Bean
    public Job importUserJob(JobRepository jobRepository, Step step1) {
        return new JobBuilder("importUserJob", jobRepository)
            .start(step1)
            .build();
    }

    @Bean
    public Step step1(JobRepository jobRepository, PlatformTransactionManager transactionManager,
                      FlatFileItemReader<User> reader, UserItemProcessor processor, JdbcBatchItemWriter<User> writer) {
        return new StepBuilder("step1", jobRepository)
            .<User, User>chunk(10, transactionManager) // Commit every 10 records
            .reader(reader)
            .processor(processor)
            .writer(writer)
            .build();
    }
}
```

### The Reader (CSV)
```java
@Bean
public FlatFileItemReader<User> reader() {
    return new FlatFileItemReaderBuilder<User>()
        .name("userItemReader")
        .resource(new ClassPathResource("users.csv"))
        .delimited()
        .names("firstName", "lastName")
        .targetType(User.class)
        .build();
}
```

### The Processor
```java
public class UserItemProcessor implements ItemProcessor<User, User> {
    @Override
    public User process(final User user) {
        // Transform data (e.g., Uppercase name)
        return new User(user.getFirstName().toUpperCase(), user.getLastName().toUpperCase());
    }
}
```

---

## 4. Restartability

Spring Batch stores metadata in the database (`BATCH_JOB_EXECUTION`, `BATCH_STEP_EXECUTION`).
If a job fails, you can restart it. Spring knows exactly where it left off.
This is the **Killer Feature** of Spring Batch.
