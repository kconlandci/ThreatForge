import type { LabManifest } from "../../types/manifest";

export const healthcareComplianceIncidentLab: LabManifest = {
  schemaVersion: "1.1",
  id: "healthcare-compliance-incident",
  version: 1,
  title: "Healthcare Compliance Incident",

  tier: "advanced",
  track: "incident-response",
  difficulty: "challenging",
  accessLevel: "premium",
  tags: [
    "hipaa",
    "healthcare",
    "compliance",
    "phi",
    "breach-notification",
    "privacy",
    "medical-devices",
  ],

  description:
    "Handle security incidents in a healthcare environment where HIPAA regulations add critical compliance dimensions. Navigate breach notification requirements, Safe Harbor provisions, BAA obligations, and workforce privacy violations.",
  estimatedMinutes: 20,
  learningObjectives: [
    "Apply HIPAA Safe Harbor provisions to encrypted device incidents",
    "Recognize when healthcare data disclosure triggers breach notification requirements",
    "Understand BAA requirements for vendors with access to healthcare systems",
    "Identify unauthorized record access as a HIPAA minimum necessary violation",
    "Balance patient care continuity with security remediation in healthcare settings",
  ],
  sortOrder: 340,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "hipaa-001",
      title: "Clinician Laptop Theft — BitLocker Enabled",
      context:
        "Dr. Sarah Chen reports her work laptop was stolen from her car overnight. The laptop has full-disk encryption (BitLocker) enabled and was powered off. It contains cached patient records from the last 7 days — approximately 450 patient encounters.",
      displayFields: [
        {
          label: "Device",
          value: "CLIN-LT-089 — Dell Latitude, BitLocker TPM+PIN",
          emphasis: "normal",
        },
        {
          label: "Encryption Status",
          value: "BitLocker enabled, device was powered off",
          emphasis: "normal",
        },
        {
          label: "Patient Data",
          value:
            "~450 patient encounters cached (names, DOB, diagnoses, medications)",
          emphasis: "warn",
        },
        {
          label: "Disk Encryption Verification",
          value:
            "MDM confirms encryption was active at last check-in (4 hours before theft)",
          emphasis: "normal",
        },
        {
          label: "Report Filed",
          value: "Police report #2026-MPD-44721 filed this morning",
          emphasis: "normal",
        },
      ],
      actions: [
        {
          id: "safe-harbor",
          label:
            "Document but NO HHS breach notification — HIPAA Safe Harbor applies",
        },
        {
          id: "notify-hhs",
          label: "Notify HHS within 60 days",
        },
        {
          id: "notify-patients",
          label: "Notify all 450 patients immediately",
        },
        {
          id: "remote-wipe",
          label: "Wipe the laptop remotely",
        },
      ],
      correctActionId: "safe-harbor",
      rationales: [
        {
          id: "rat-safe-harbor",
          text: "HIPAA Safe Harbor provision excludes encrypted devices from breach notification when the device was secured (powered off) and encryption is verified active — document thoroughly, notify privacy officer, file police report, but formal breach notification is not required.",
        },
        {
          id: "rat-hhs",
          text: "Notifying HHS when Safe Harbor applies creates unnecessary regulatory burden and may trigger an investigation where none is warranted.",
        },
        {
          id: "rat-patients",
          text: "Notifying patients causes alarm when their data is protected by encryption — the Safe Harbor provision exists precisely to avoid unnecessary panic.",
        },
        {
          id: "rat-wipe",
          text: "Remote wipe won't work on a powered-off device not connected to the network — and even if it could, the encryption already protects the data.",
        },
      ],
      correctRationaleId: "rat-safe-harbor",
      feedback: {
        perfect:
          "Correct. BitLocker encryption was verified active on a powered-off device — HIPAA Safe Harbor applies. Document the incident thoroughly but formal breach notification is not required.",
        partial:
          "You identified the encryption factor but didn't correctly apply the Safe Harbor provision. Encrypted devices that were secured at the time of loss are explicitly excluded from breach notification.",
        wrong: "This response either triggers unnecessary notifications or attempts a technical action that won't work. The Safe Harbor provision is the key regulatory framework here.",
      },
    },
    {
      type: "action-rationale",
      id: "hipaa-002",
      title: "Mass CC Disclosure — Appointment Reminders",
      context:
        "A hospital scheduling coordinator sent appointment reminder emails to 340 patients — but used CC instead of BCC. Every recipient can see every other recipient's name, email address, and the fact that they have an appointment at Valley General Hospital Oncology Department.",
      displayFields: [
        {
          label: "Recipients",
          value: "340 patients in CC field",
          emphasis: "critical",
        },
        {
          label: "Department",
          value: "Oncology — cancer treatment context implied",
          emphasis: "critical",
        },
        {
          label: "Information Exposed",
          value: "Patient names, email addresses, hospital/dept association",
          emphasis: "critical",
        },
        {
          label: "Threshold",
          value: "500+ affected = immediate HHS notification required",
          emphasis: "warn",
        },
        {
          label: "Recall Status",
          value:
            "Email cannot be recalled — already delivered and read by multiple recipients",
          emphasis: "warn",
        },
      ],
      actions: [
        {
          id: "breach-notify",
          label: "Invoke breach notification — this is PHI disclosure",
          color: "red",
        },
        {
          id: "internal-only",
          label: "Document internally only — email addresses aren't PHI",
        },
        {
          id: "apology",
          label: "Send apology email to affected patients",
        },
        {
          id: "retrain",
          label: "Retrain the coordinator",
        },
      ],
      correctActionId: "breach-notify",
      rationales: [
        {
          id: "rat-breach",
          text: "Patient email addresses linked to an oncology department appointment constitute PHI — the combination reveals that these individuals are receiving cancer care, which is a diagnosis-level disclosure requiring breach notification even though it's under the 500-person HHS threshold.",
        },
        {
          id: "rat-internal",
          text: "Email addresses become PHI when linked to healthcare context — knowing someone has an oncology appointment reveals their health condition.",
        },
        {
          id: "rat-apology",
          text: "An apology without formal notification doesn't meet HIPAA requirements — the breach notification process includes specific content and timing obligations.",
        },
        {
          id: "rat-retrain",
          text: "Retraining alone doesn't address the notification obligation — it's a corrective action but not a substitute for breach response.",
        },
      ],
      correctRationaleId: "rat-breach",
      feedback: {
        perfect:
          "Correct. Email addresses + oncology department = PHI disclosure. The combination reveals health condition information, triggering breach notification requirements even for under-500 incidents.",
        partial:
          "You recognized this is a problem but didn't correctly classify it as a breach requiring formal notification. The healthcare context transforms email addresses into PHI.",
        wrong: "This response fails to recognize that email addresses linked to an oncology department constitute PHI. The breach notification process must be invoked.",
      },
    },
    {
      type: "action-rationale",
      id: "hipaa-003",
      title: "Uncontrolled Vendor Access — Missing BAA",
      context:
        "During a network audit, you discover that MedTech Solutions (your MRI equipment vendor) has a persistent VPN connection to your hospital network. Their credentials haven't been rotated in 2 years. No Business Associate Agreement (BAA) is on file.",
      displayFields: [
        {
          label: "Vendor",
          value: "MedTech Solutions — MRI maintenance",
          emphasis: "normal",
        },
        {
          label: "VPN Access",
          value: "Persistent site-to-site VPN, 24/7",
          emphasis: "warn",
        },
        {
          label: "Credential Age",
          value: "Service account password last changed: March 2024",
          emphasis: "warn",
        },
        {
          label: "BAA Status",
          value: "No BAA on file — HIPAA violation",
          emphasis: "critical",
        },
        {
          label: "Access Scope",
          value: "VPN grants access to medical device VLAN + general network",
          emphasis: "critical",
        },
      ],
      actions: [
        {
          id: "scope-baa-rotate",
          label:
            "Scope VPN to device VLAN only + initiate BAA + rotate credentials",
        },
        {
          id: "terminate-access",
          label: "Terminate vendor access immediately",
          color: "red",
        },
        {
          id: "send-baa",
          label: "Send BAA template and wait for signature",
        },
        {
          id: "document-next-audit",
          label: "Document the finding for next audit",
        },
      ],
      correctActionId: "scope-baa-rotate",
      rationales: [
        {
          id: "rat-scope",
          text: "The missing BAA is a HIPAA violation that needs immediate contractual remediation, but terminating access to MRI maintenance could impact patient care — scope the VPN to only the medical device VLAN, rotate stale credentials, and fast-track the BAA.",
        },
        {
          id: "rat-terminate",
          text: "Terminating vendor access risks MRI equipment failures affecting patient care — medical device maintenance is critical for clinical operations.",
        },
        {
          id: "rat-send-baa",
          text: "Sending a BAA and waiting doesn't address the overly broad network access or the stale credentials — both are immediate security risks.",
        },
        {
          id: "rat-document",
          text: "Documenting for next audit ignores a current HIPAA violation — the missing BAA and excessive access need to be addressed now, not at the next review cycle.",
        },
      ],
      correctRationaleId: "rat-scope",
      feedback: {
        perfect:
          "Correct. The three-part response addresses all risks: scope the VPN to reduce the blast radius, rotate credentials to address the stale password, and initiate a BAA to resolve the compliance gap — all without disrupting patient care.",
        partial:
          "You addressed part of the issue but missed the full scope. The optimal response simultaneously reduces network access, rotates credentials, AND initiates the BAA process.",
        wrong: "This response either disrupts patient care or ignores an active HIPAA violation. Healthcare security must balance compliance with clinical operations.",
      },
    },
    {
      type: "action-rationale",
      id: "hipaa-004",
      title: "Unauthorized Record Access — Curiosity Snooping",
      context:
        "Audit log review reveals that a registration clerk accessed a celebrity patient's medical record 15 minutes after the patient was seen in the ER lobby. The clerk had no clinical involvement in the patient's care and is not assigned to the ER department.",
      displayFields: [
        {
          label: "Employee",
          value: "T. Williams — Registration Clerk (Outpatient)",
          emphasis: "normal",
        },
        {
          label: "Patient",
          value: "High-profile public figure (name redacted)",
          emphasis: "warn",
        },
        {
          label: "Access",
          value:
            "Viewed: demographics, ER triage notes, diagnosis, medications",
          emphasis: "critical",
        },
        {
          label: "Clinical Justification",
          value:
            "None — employee works in outpatient registration, no assignment to ER",
          emphasis: "critical",
        },
        {
          label: "Prior History",
          value: "No previous audit findings. Employee for 6 years.",
          emphasis: "normal",
        },
      ],
      actions: [
        {
          id: "report-privacy",
          label:
            "Report to privacy officer — this is a HIPAA minimum necessary violation",
        },
        {
          id: "verbal-warning",
          label: "Verbal warning and retraining",
        },
        {
          id: "no-action",
          label:
            "No action — employees can access any record in their department",
        },
        {
          id: "terminate",
          label: "Terminate employment immediately",
          color: "red",
        },
      ],
      correctActionId: "report-privacy",
      rationales: [
        {
          id: "rat-report",
          text: "Accessing a patient record without clinical justification violates the HIPAA 'minimum necessary' standard regardless of intent — the privacy officer must investigate, document, and determine appropriate sanctions per workforce policy.",
        },
        {
          id: "rat-verbal",
          text: "A verbal warning bypasses the required investigation and documentation process — the privacy officer needs to formally assess the violation.",
        },
        {
          id: "rat-no-action",
          text: "Employees cannot access records without a legitimate clinical or administrative purpose even within the same hospital — the minimum necessary standard applies to all workforce members.",
        },
        {
          id: "rat-terminate",
          text: "Termination may be warranted but that's the privacy officer's determination after investigation — jumping to termination bypasses due process.",
        },
      ],
      correctRationaleId: "rat-report",
      feedback: {
        perfect:
          "Correct. Unauthorized record access must be reported to the privacy officer for formal investigation. The HIPAA minimum necessary standard applies regardless of the employee's tenure or intent.",
        partial:
          "You recognized this is a violation but didn't follow the correct process. The privacy officer must investigate — security analysts report the finding, not determine the sanction.",
        wrong: "This response either ignores a clear HIPAA violation or bypasses the required investigation process. All unauthorized access events must go through the privacy officer.",
      },
    },
  ],

  hints: [
    "The HIPAA Safe Harbor provision means encrypted devices don't require breach notification IF the encryption was verified active at the time of the incident.",
    "Email addresses become PHI when they're linked to healthcare context — patient email + hospital department = health condition inference.",
    "Unauthorized record access ('curiosity snooping') must be reported to the privacy officer regardless of whether the information was further disclosed. The access itself is the violation.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Healthcare security is one of the highest-demand cybersecurity specializations. HIPAA compliance adds regulatory complexity that general security analysts don't encounter. Healthcare CISOs specifically recruit analysts who understand both the security AND regulatory dimensions of incidents.",
  toolRelevance: [
    "Epic / Cerner (EHR audit logs)",
    "Microsoft Purview (DLP for healthcare)",
    "Imprivata (healthcare access management)",
    "HIPAA breach assessment toolkit",
  ],

  createdAt: "2026-03-23",
  updatedAt: "2026-03-23",
};
