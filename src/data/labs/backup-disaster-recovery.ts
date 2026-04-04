import type { LabManifest } from "../../types/manifest";

export const backupDisasterRecoveryLab: LabManifest = {
  schemaVersion: "1.1",
  id: "backup-disaster-recovery",
  version: 1,
  title: "Backup & Disaster Recovery Decisions",

  tier: "intermediate",
  track: "incident-response",
  difficulty: "moderate",
  accessLevel: "free",
  tags: [
    "backup",
    "disaster-recovery",
    "business-continuity",
    "ransomware-recovery",
    "rpo-rto",
  ],

  description:
    "Make critical backup and disaster recovery decisions during incidents — choosing between recovery strategies, validating backup integrity, and balancing recovery speed with data completeness.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Evaluate backup recovery options based on RPO and RTO requirements",
    "Validate backup integrity before initiating recovery",
    "Balance recovery speed with data completeness during incidents",
  ],
  sortOrder: 460,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "bdr-001",
      title: "Ransomware Recovery — Which Backup?",
      context:
        "After successfully containing a ransomware incident, the team needs to recover a critical financial database. Three recovery options are available, each with different trade-offs between data loss and confidence in backup cleanliness.",
      displayFields: [
        {
          label: "System",
          value: "FIN-DB-PRIMARY — Accounts Receivable Database",
          emphasis: "critical",
        },
        {
          label: "Option A",
          value: "Last night's backup — 8 hours data loss, verified clean by AV scan",
          emphasis: "warn",
        },
        {
          label: "Option B",
          value: "Backup from 3 days ago — verified clean, confirmed pre-compromise",
          emphasis: "normal",
        },
        {
          label: "Option C",
          value: "Attempt decryption with recovered encryption key",
          emphasis: "warn",
        },
        {
          label: "Business Impact",
          value: "Finance team blocked — month-end close in 48 hours",
          emphasis: "critical",
        },
      ],
      actions: [
        {
          id: "LAST_NIGHT",
          label: "Use last night's backup after verification",
          color: "green",
        },
        {
          id: "THREE_DAYS",
          label: "Use the 3-day-old backup for maximum safety",
          color: "orange",
        },
        {
          id: "DECRYPT",
          label: "Attempt decryption with recovered key",
          color: "red",
        },
        {
          id: "WAIT_FORENSICS",
          label: "Wait for full forensic analysis before any recovery",
          color: "yellow",
        },
      ],
      correctActionId: "LAST_NIGHT",
      rationales: [
        {
          id: "rat-recent",
          text: "The most recent verified-clean backup minimizes data loss while ensuring no malware persists.",
        },
        {
          id: "rat-old",
          text: "The 3-day-old backup is safe but loses 3 days of financial transactions during month-end — the data recovery effort would be enormous.",
        },
        {
          id: "rat-decrypt",
          text: "Decryption with a recovered key is unreliable — the key may be incomplete, and the decrypted data may still contain malware persistence mechanisms.",
        },
        {
          id: "rat-wait",
          text: "Waiting for full forensics delays recovery by days and blocks the finance team from completing month-end close.",
        },
      ],
      correctRationaleId: "rat-recent",
      feedback: {
        perfect:
          "Correct. The most recent verified-clean backup is the optimal choice — it minimizes data loss to 8 hours while the clean scan provides confidence that no malware persists. This gets finance back online fastest.",
        partial:
          "Your choice is defensible but not optimal. The 3-day-old backup loses too much financial data during month-end, while decryption is unreliable. The most recent verified-clean backup balances safety and data completeness.",
        wrong:
          "Attempting decryption or waiting indefinitely both carry significant risks. Decryption may fail or leave malware intact, and prolonged delays have serious business consequences during month-end close.",
      },
    },
    {
      type: "action-rationale",
      id: "bdr-002",
      title: "Backup Integrity Check Fails",
      context:
        "During a disaster recovery exercise triggered by a real storage array failure, the primary backup set fails its integrity verification checksum. The secondary offsite backup is 48 hours old but passes all integrity checks. The business needs the ERP system online within 2 hours.",
      displayFields: [
        {
          label: "System",
          value: "ERP-PROD-01 — Enterprise Resource Planning",
          emphasis: "critical",
        },
        {
          label: "Primary Backup",
          value: "FAILED integrity check — checksum mismatch on 3 of 12 volumes",
          emphasis: "critical",
        },
        {
          label: "Secondary Backup",
          value: "48 hours old — all integrity checks passed",
          emphasis: "warn",
        },
        {
          label: "Transaction Logs",
          value: "Continuous transaction logs available from secondary backup to point of failure",
          emphasis: "normal",
        },
        {
          label: "RTO Requirement",
          value: "2 hours — manufacturing line depends on ERP",
          emphasis: "critical",
        },
      ],
      actions: [
        {
          id: "SECONDARY_LOGS",
          label: "Use verified 48-hour backup and recover delta from transaction logs",
          color: "green",
        },
        {
          id: "RETRY_PRIMARY",
          label: "Retry primary backup restoration from a different tape copy",
          color: "orange",
        },
        {
          id: "PARTIAL_PRIMARY",
          label: "Restore only the 9 good volumes from the primary backup",
          color: "yellow",
        },
        {
          id: "REBUILD",
          label: "Rebuild the ERP system from scratch",
          color: "red",
        },
      ],
      correctActionId: "SECONDARY_LOGS",
      rationales: [
        {
          id: "rat-verified",
          text: "A verified older backup is always better than a corrupted recent one — transaction logs can bridge the gap.",
        },
        {
          id: "rat-retry",
          text: "Retrying the primary backup wastes precious RTO time and may produce the same corruption from a systematic issue.",
        },
        {
          id: "rat-partial",
          text: "Partial restoration of an ERP system creates data inconsistencies between modules that are extremely difficult to resolve.",
        },
        {
          id: "rat-rebuild",
          text: "Rebuilding from scratch would take days or weeks, far exceeding the 2-hour RTO requirement.",
        },
      ],
      correctRationaleId: "rat-verified",
      feedback: {
        perfect:
          "Excellent decision. The verified 48-hour backup combined with transaction log replay gives you a complete, trustworthy recovery within the RTO window. Never trust a backup that fails integrity checks.",
        partial:
          "You made a reasonable choice, but it has risks. Retrying corrupt backups wastes time, and partial restores create data consistency nightmares. A verified backup with transaction log replay is the proven approach.",
        wrong:
          "Rebuilding from scratch or using known-corrupt backups are both unacceptable when a verified backup and transaction logs are available. Trust the integrity checks — they exist for this exact situation.",
      },
    },
    {
      type: "action-rationale",
      id: "bdr-003",
      title: "Cloud Region Failure — Multi-Region Failover",
      context:
        "The primary AWS region (us-east-1) is experiencing a major outage affecting all services. Your DR region (us-west-2) has a warm standby that's 15 minutes behind due to asynchronous replication. The CFO is asking if you can achieve zero data loss.",
      displayFields: [
        {
          label: "Primary Region",
          value: "us-east-1 — MAJOR OUTAGE, all services down",
          emphasis: "critical",
        },
        {
          label: "DR Region",
          value: "us-west-2 — warm standby operational",
          emphasis: "normal",
        },
        {
          label: "Replication Lag",
          value: "15 minutes — async replication by design",
          emphasis: "warn",
        },
        {
          label: "Current Downtime",
          value: "45 minutes and counting — no ETA from AWS",
          emphasis: "critical",
        },
        {
          label: "CFO Request",
          value: "Demanding zero data loss recovery",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "FAILOVER_ACCEPT",
          label: "Fail over to DR region and accept the 15-minute data gap",
          color: "green",
        },
        {
          id: "WAIT_PRIMARY",
          label: "Wait for primary region to recover for zero data loss",
          color: "red",
        },
        {
          id: "FAILOVER_RECONSTRUCT",
          label: "Fail over and attempt to reconstruct the 15-minute gap manually",
          color: "orange",
        },
        {
          id: "HYBRID",
          label: "Partial failover for read-only access while waiting",
          color: "yellow",
        },
      ],
      correctActionId: "FAILOVER_ACCEPT",
      rationales: [
        {
          id: "rat-failover",
          text: "Async replication inherently has a lag — waiting for the primary region risks extended total outage. The 15-minute gap is acceptable.",
        },
        {
          id: "rat-wait",
          text: "Waiting for the primary region could mean hours of total downtime with no guarantee of data preservation — the region may have already lost the last 15 minutes anyway.",
        },
        {
          id: "rat-reconstruct",
          text: "Manual reconstruction adds complexity and delay to recovery. Application logs and customer resubmission can address the gap after services are restored.",
        },
        {
          id: "rat-hybrid",
          text: "Partial failover creates a split-brain scenario that's more dangerous than a clean failover to DR.",
        },
      ],
      correctRationaleId: "rat-failover",
      feedback: {
        perfect:
          "Correct call. With 45 minutes of downtime and no AWS ETA, failing over to the DR region is essential. The 15-minute async replication gap is an accepted architectural trade-off — it's why you chose async over sync replication in the first place. Communicate the gap honestly to the CFO.",
        partial:
          "You're trying to minimize data loss, which is admirable. But in a regional outage, every minute of waiting is a minute of total downtime. The 15-minute gap was accepted when async replication was architected — fail over and reconcile afterward.",
        wrong:
          "Waiting for an uncertain primary region recovery during a major outage risks hours of additional downtime. The DR region exists for exactly this scenario. Zero data loss requires synchronous replication, which was a design choice made long before this incident.",
      },
    },
  ],

  hints: [
    "In ransomware recovery, the most recent verified-clean backup is almost always the best choice — it minimizes data loss while ensuring malware doesn't persist.",
    "Never trust a backup that fails integrity verification. A verified older backup plus transaction logs is more reliable than a corrupt recent one.",
    "Asynchronous replication means accepting some data loss during failover. This is a design decision, not an incident response failure.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Disaster recovery planning and execution is a high-value skill. Organizations that can recover quickly from incidents spend significantly less on total breach costs.",
  toolRelevance: [
    "Veeam",
    "AWS Backup",
    "Commvault",
    "Zerto",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
