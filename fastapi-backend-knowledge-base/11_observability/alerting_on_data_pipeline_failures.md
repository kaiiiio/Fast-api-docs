# Alerting on Data Pipeline Failures: Complete Guide

Alerting on data pipeline failures ensures quick detection and response to issues. This guide covers comprehensive alerting strategies, metrics, and notification systems.

## Understanding the Need for Alerting

**Why alert on pipeline failures?**
- Data pipelines often run unattended (scheduled jobs)
- Failures can cascade to downstream systems
- Early detection prevents data corruption
- Quick response minimizes business impact

**What to monitor:**
- Pipeline execution failures
- Data quality issues
- Performance degradation
- Resource exhaustion

## Step 1: Comprehensive Failure Tracking

### Basic Failure Metrics

```python
from prometheus_client import Counter, Histogram, Gauge
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Pipeline failure metrics
pipeline_failures_total = Counter(
    'data_pipeline_failures_total',
    'Total pipeline failures',
    ['pipeline_name', 'stage', 'error_type']
)

pipeline_executions_total = Counter(
    'data_pipeline_executions_total',
    'Total pipeline executions',
    ['pipeline_name', 'status']
)

pipeline_duration_seconds = Histogram(
    'data_pipeline_duration_seconds',
    'Pipeline execution duration',
    ['pipeline_name', 'status'],
    buckets=(10, 30, 60, 300, 600, 1800, 3600)
)

pipeline_last_success = Gauge(
    'data_pipeline_last_success_timestamp',
    'Timestamp of last successful pipeline run',
    ['pipeline_name']
)
```

### Tracking Pipeline Stages

```python
async def process_data_pipeline(pipeline_name: str = "etl"):
    """
    Process data pipeline with comprehensive failure tracking.
    
    Tracks each stage separately for granular alerting.
    """
    start_time = datetime.utcnow()
    stage = "initialization"
    
    try:
        # Stage 1: Extract
        stage = "extract"
        logger.info(f"Pipeline {pipeline_name}: Starting {stage} stage")
        extracted_data = await extract_data()
        
        # Stage 2: Transform
        stage = "transform"
        logger.info(f"Pipeline {pipeline_name}: Starting {stage} stage")
        transformed_data = await transform_data(extracted_data)
        
        # Stage 3: Validate
        stage = "validate"
        logger.info(f"Pipeline {pipeline_name}: Starting {stage} stage")
        validation_result = await validate_data(transformed_data)
        
        if not validation_result.is_valid:
            raise DataQualityError(f"Data validation failed: {validation_result.errors}")
        
        # Stage 4: Load
        stage = "load"
        logger.info(f"Pipeline {pipeline_name}: Starting {stage} stage")
        await load_data(transformed_data)
        
        # Success metrics
        duration = (datetime.utcnow() - start_time).total_seconds()
        pipeline_executions_total.labels(
            pipeline_name=pipeline_name,
            status='success'
        ).inc()
        pipeline_duration_seconds.labels(
            pipeline_name=pipeline_name,
            status='success'
        ).observe(duration)
        pipeline_last_success.labels(pipeline_name=pipeline_name).set(
            datetime.utcnow().timestamp()
        )
        
        logger.info(f"Pipeline {pipeline_name}: Completed successfully in {duration}s")
        
    except DataQualityError as e:
        # Data quality failure (different severity)
        error_type = "data_quality"
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        pipeline_failures_total.labels(
            pipeline_name=pipeline_name,
            stage=stage,
            error_type=error_type
        ).inc()
        pipeline_executions_total.labels(
            pipeline_name=pipeline_name,
            status='data_quality_failure'
        ).inc()
        
        await send_alert(
            severity="warning",
            pipeline=pipeline_name,
            stage=stage,
            error=str(e),
            error_type=error_type
        )
        raise
    
    except Exception as e:
        # General failure
        error_type = type(e).__name__
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        pipeline_failures_total.labels(
            pipeline_name=pipeline_name,
            stage=stage,
            error_type=error_type
        ).inc()
        pipeline_executions_total.labels(
            pipeline_name=pipeline_name,
            status='failure'
        ).inc()
        pipeline_duration_seconds.labels(
            pipeline_name=pipeline_name,
            status='failure'
        ).observe(duration)
        
        logger.error(
            f"Pipeline {pipeline_name} failed at stage {stage}: {e}",
            exc_info=True
        )
        
        await send_alert(
            severity="critical",
            pipeline=pipeline_name,
            stage=stage,
            error=str(e),
            error_type=error_type
        )
        raise
```

## Step 2: Alert Severity Levels

### Defining Severity Levels

```python
from enum import Enum

class AlertSeverity(str, Enum):
    INFO = "info"           # Informational (no action needed)
    WARNING = "warning"     # Potential issue (monitor)
    ERROR = "error"         # Issue detected (investigate)
    CRITICAL = "critical"   # Immediate action required

def determine_severity(
    error_type: str,
    stage: str,
    failure_count: int
) -> AlertSeverity:
    """
    Determine alert severity based on context.
    
    Rules:
    - Data quality issues: Warning (usually recoverable)
    - Connection failures: Error (might be transient)
    - Complete pipeline failure: Critical
    - Multiple failures: Escalate severity
    """
    # Critical failures
    if error_type in ["OutOfMemoryError", "DatabaseConnectionError"]:
        return AlertSeverity.CRITICAL
    
    # Errors that block pipeline
    if stage == "load" and error_type == "DataValidationError":
        return AlertSeverity.ERROR
    
    # Warnings for recoverable issues
    if error_type == "DataQualityError":
        return AlertSeverity.WARNING
    
    # Default
    return AlertSeverity.ERROR
```

## Step 3: Prometheus Alert Rules

### Comprehensive Alert Rules

```yaml
# prometheus/alerts/data_pipeline.yml
groups:
  - name: data_pipeline_alerts
    interval: 30s
    rules:
      # Alert: Pipeline failure rate too high
      - alert: HighPipelineFailureRate
        expr: |
          (
            sum(rate(data_pipeline_failures_total[5m])) by (pipeline_name) /
            sum(rate(data_pipeline_executions_total[5m])) by (pipeline_name)
          ) > 0.1
        for: 5m
        labels:
          severity: critical
          component: data_pipeline
        annotations:
          summary: "Pipeline {{ $labels.pipeline_name }} has high failure rate"
          description: |
            Pipeline {{ $labels.pipeline_name }} is failing 
            {{ $value | humanizePercentage }} of the time over the last 5 minutes.
            Action required: Investigate pipeline failures.
      
      # Alert: Pipeline not running
      - alert: PipelineNotRunning
        expr: |
          time() - max(data_pipeline_last_success_timestamp) by (pipeline_name) > 3600
        for: 10m
        labels:
          severity: critical
          component: data_pipeline
        annotations:
          summary: "Pipeline {{ $labels.pipeline_name }} has not run successfully"
          description: |
            Pipeline {{ $labels.pipeline_name }} has not completed successfully
            in over 1 hour. Last success: {{ $value | humanizeDuration }} ago.
      
      # Alert: Pipeline taking too long
      - alert: SlowPipelineExecution
        expr: |
          histogram_quantile(0.95,
            rate(data_pipeline_duration_seconds_bucket[10m])
          ) by (pipeline_name) > 1800
        for: 10m
        labels:
          severity: warning
          component: data_pipeline
        annotations:
          summary: "Pipeline {{ $labels.pipeline_name }} is running slowly"
          description: |
            Pipeline {{ $labels.pipeline_name }} is taking longer than normal.
            P95 duration: {{ $value | humanizeDuration }}.
      
      # Alert: Specific stage failures
      - alert: PipelineStageFailure
        expr: |
          rate(data_pipeline_failures_total{stage!="initialization"}[5m]) > 0
        for: 2m
        labels:
          severity: error
          component: data_pipeline
        annotations:
          summary: "Pipeline stage {{ $labels.stage }} is failing"
          description: |
            Stage {{ $labels.stage }} in pipeline {{ $labels.pipeline_name }}
            is experiencing failures. Error type: {{ $labels.error_type }}.
      
      # Alert: Data quality issues
      - alert: DataQualityIssues
        expr: |
          rate(data_pipeline_failures_total{error_type="data_quality"}[15m]) > 0.05
        for: 10m
        labels:
          severity: warning
          component: data_pipeline
        annotations:
          summary: "High rate of data quality failures"
          description: |
            Pipeline {{ $labels.pipeline_name }} is experiencing frequent
            data quality issues. Review data validation rules.
```

## Step 4: Alert Notification System

### Multi-Channel Alert Notifications

```python
from typing import List
import httpx
from datetime import datetime

class AlertNotifier:
    """Send alerts to multiple channels."""
    
    def __init__(
        self,
        slack_webhook_url: str = None,
        pagerduty_api_key: str = None,
        email_config: dict = None
    ):
        self.slack_webhook_url = slack_webhook_url
        self.pagerduty_api_key = pagerduty_api_key
        self.email_config = email_config
    
    async def send_alert(
        self,
        severity: AlertSeverity,
        pipeline: str,
        stage: str,
        error: str,
        error_type: str,
        context: dict = None
    ):
        """Send alert to all configured channels."""
        alert_data = {
            "severity": severity.value,
            "pipeline": pipeline,
            "stage": stage,
            "error": error,
            "error_type": error_type,
            "timestamp": datetime.utcnow().isoformat(),
            "context": context or {}
        }
        
        # Send to all channels
        tasks = []
        
        if self.slack_webhook_url:
            tasks.append(self._send_slack_alert(alert_data))
        
        if self.pagerduty_api_key and severity in [AlertSeverity.ERROR, AlertSeverity.CRITICAL]:
            tasks.append(self._send_pagerduty_alert(alert_data))
        
        if self.email_config and severity == AlertSeverity.CRITICAL:
            tasks.append(self._send_email_alert(alert_data))
        
        # Send all notifications concurrently
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _send_slack_alert(self, alert_data: dict):
        """Send alert to Slack."""
        severity_colors = {
            "info": "#36a64f",      # Green
            "warning": "#ff9900",   # Orange
            "error": "#ff0000",     # Red
            "critical": "#8B0000"   # Dark red
        }
        
        payload = {
            "attachments": [{
                "color": severity_colors.get(alert_data["severity"], "#808080"),
                "title": f"🚨 Pipeline Alert: {alert_data['pipeline']}",
                "fields": [
                    {"title": "Severity", "value": alert_data["severity"].upper(), "short": True},
                    {"title": "Stage", "value": alert_data["stage"], "short": True},
                    {"title": "Error Type", "value": alert_data["error_type"], "short": True},
                    {"title": "Error", "value": alert_data["error"][:500], "short": False},
                    {"title": "Timestamp", "value": alert_data["timestamp"], "short": True}
                ],
                "footer": "Data Pipeline Monitoring",
                "ts": int(datetime.fromisoformat(alert_data["timestamp"]).timestamp())
            }]
        }
        
        async with httpx.AsyncClient() as client:
            await client.post(self.slack_webhook_url, json=payload)
    
    async def _send_pagerduty_alert(self, alert_data: dict):
        """Send alert to PagerDuty."""
        severity_map = {
            "error": "error",
            "critical": "critical"
        }
        
        payload = {
            "routing_key": self.pagerduty_api_key,
            "event_action": "trigger",
            "payload": {
                "summary": f"Pipeline {alert_data['pipeline']} failed at {alert_data['stage']}",
                "severity": severity_map.get(alert_data["severity"], "error"),
                "source": "data-pipeline",
                "custom_details": alert_data
            }
        }
        
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://events.pagerduty.com/v2/enqueue",
                json=payload
            )
    
    async def _send_email_alert(self, alert_data: dict):
        """Send alert via email."""
        # Email implementation
        pass

# Initialize notifier
alert_notifier = AlertNotifier(
    slack_webhook_url=os.getenv("SLACK_WEBHOOK_URL"),
    pagerduty_api_key=os.getenv("PAGERDUTY_API_KEY")
)

async def send_alert(severity: AlertSeverity, pipeline: str, stage: str, error: str, error_type: str):
    """Helper function to send alerts."""
    await alert_notifier.send_alert(
        severity=severity,
        pipeline=pipeline,
        stage=stage,
        error=error,
        error_type=error_type
    )
```

## Step 5: Alert Routing and Escalation

### Alert Routing Rules

```python
class AlertRouter:
    """Route alerts based on severity and rules."""
    
    def __init__(self):
        self.routing_rules = {
            AlertSeverity.CRITICAL: ["pagerduty", "slack", "email"],
            AlertSeverity.ERROR: ["slack", "email"],
            AlertSeverity.WARNING: ["slack"],
            AlertSeverity.INFO: []  # Log only
        }
    
    async def route_alert(self, alert_data: dict):
        """Route alert to appropriate channels."""
        severity = AlertSeverity(alert_data["severity"])
        channels = self.routing_rules.get(severity, ["slack"])
        
        for channel in channels:
            if channel == "pagerduty":
                await self._send_pagerduty(alert_data)
            elif channel == "slack":
                await self._send_slack(alert_data)
            elif channel == "email":
                await self._send_email(alert_data)
```

### Escalation Policies

```python
class AlertEscalation:
    """Handle alert escalation if not acknowledged."""
    
    async def escalate_alert(self, alert_id: str):
        """Escalate unacknowledged critical alerts."""
        # Check if alert acknowledged within 15 minutes
        # If not, escalate to on-call engineer
        pass
```

## Step 6: Integration with FastAPI

### Health Check with Pipeline Status

```python
from fastapi import APIRouter
from prometheus_client import generate_latest

router = APIRouter()

@router.get("/health/pipelines")
async def pipeline_health():
    """Check health of all data pipelines."""
    pipelines = ["etl", "analytics", "reporting"]
    health_status = {}
    
    for pipeline in pipelines:
        # Query Prometheus for last success time
        # (In real implementation, query Prometheus API)
        health_status[pipeline] = {
            "status": "healthy",  # or "degraded", "unhealthy"
            "last_success": None,
            "failure_rate": 0.0
        }
    
    return health_status
```

## Step 7: Dashboard and Visualization

### Grafana Dashboard Queries

```promql
# Pipeline success rate
sum(rate(data_pipeline_executions_total{status="success"}[5m])) / 
sum(rate(data_pipeline_executions_total[5m]))

# Failure rate by stage
sum(rate(data_pipeline_failures_total[5m])) by (stage)

# Average pipeline duration
rate(data_pipeline_duration_seconds_sum[5m]) / 
rate(data_pipeline_duration_seconds_count[5m])

# Time since last success
time() - data_pipeline_last_success_timestamp
```

## Best Practices

1. **Alert on symptoms, not causes**: Alert on business impact
2. **Use appropriate severity**: Don't cry wolf
3. **Include context**: Error messages, stack traces, relevant data
4. **Test alerting**: Ensure alerts work before production issues
5. **Document runbooks**: What to do when alerts fire
6. **Review and tune**: Remove noisy alerts, add missing ones

## Summary

Comprehensive alerting provides:
- ✅ Early failure detection
- ✅ Quick incident response
- ✅ Pipeline health visibility
- ✅ Data quality assurance

Implement proper alerting to maintain reliable data pipelines!
