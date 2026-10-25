package com.smartmonitor.backend.model;

import com.google.cloud.Timestamp;

public class ReadingEntity {
    private Timestamp ts;
    private double value;
    private double min;
    private double max;
    private int count;
    private Timestamp expireAt;

    public ReadingEntity() {}

    public ReadingEntity(
            Timestamp ts, double value, double min, double max, int count, Timestamp expireAt) {
        this.ts = ts;
        this.value = value;
        this.min = min;
        this.max = max;
        this.count = count;
        this.expireAt = expireAt;
    }

    public Timestamp getTs() { return ts; }
    public void setTs(Timestamp ts) { this.ts = ts; }
    public double getValue() { return value; }
    public void setValue(double value) { this.value = value; }
    public double getMin() { return min; }
    public void setMin(double min) { this.min = min; }
    public double getMax() { return max; }
    public void setMax(double max) { this.max = max; }
    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }
    public Timestamp getExpireAt() { return expireAt; }
    public void setExpireAt(Timestamp expireAt) { this.expireAt = expireAt; }
}
