package com.smartmonitor.backend.model;

import com.google.cloud.Timestamp;
import java.util.Map;

public class AuditLogEntity {
    private String userId;
    private String action;
    private String entityId;
    private Timestamp timestamp;
    private Map<String, Object> details;

    public AuditLogEntity() {}

    public AuditLogEntity(
            String userId,
            String action,
            String entityId,
            Timestamp timestamp,
            Map<String, Object> details) {
        this.userId = userId;
        this.action = action;
        this.entityId = entityId;
        this.timestamp = timestamp;
        this.details = details;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getEntityId() { return entityId; }
    public void setEntityId(String entityId) { this.entityId = entityId; }
    public Timestamp getTimestamp() { return timestamp; }
    public void setTimestamp(Timestamp timestamp) { this.timestamp = timestamp; }
    public Map<String, Object> getDetails() { return details; }
    public void setDetails(Map<String, Object> details) { this.details = details; }
}
