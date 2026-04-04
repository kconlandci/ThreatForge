import type { LabManifest } from "../../types/manifest";

export const usbDropAttackResponseLab: LabManifest = {
  schemaVersion: "1.1",
  id: "usb-drop-attack-response",
  version: 1,
  title: "USB Drop Attack Response",

  tier: "beginner",
  track: "incident-response",
  difficulty: "easy",
  accessLevel: "free",
  tags: [
    "usb",
    "rubber-ducky",
    "physical-security",
    "incident-response",
    "endpoint-detection",
    "social-engineering",
  ],

  description:
    "Respond to suspicious USB devices found in and around the workplace. Evaluate EDR alerts, assess containment needs, and distinguish malicious drops from legitimate devices while following incident response procedures.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Identify indicators of a USB drop attack versus a legitimate lost device",
    "Apply correct incident response procedures when a malicious USB is detected",
    "Determine appropriate containment actions when a suspicious device has already been connected",
    "Evaluate risk levels of USB devices based on context and EDR telemetry",
  ],
  sortOrder: 408,

  status: "published",
  prerequisites: [],

  rendererType: "action-rationale",

  scenarios: [
    {
      type: "action-rationale",
      id: "usb-001",
      title: "USB Rubber Ducky Detected by EDR",
      context:
        "Your EDR platform fires a high-severity alert: a USB device plugged into a workstation in the finance department registered as a Human Interface Device (HID) keyboard and executed a rapid sequence of keystrokes within 2 seconds of insertion. The workstation user says they found the drive in the parking lot and were curious.",
      displayFields: [
        { label: "EDR Alert", value: "HID keystroke injection — 847 keystrokes in 1.8s", emphasis: "critical" },
        { label: "Device Class", value: "USB HID Keyboard (not mass storage)", emphasis: "critical" },
        { label: "Workstation", value: "FIN-WS-042 — Finance Department", emphasis: "warn" },
        { label: "Payload Detected", value: "PowerShell encoded command executed", emphasis: "critical" },
        { label: "Network Activity", value: "Outbound HTTPS to 185.220.xx.xx (unresolved)", emphasis: "critical" },
      ],
      actions: [
        { id: "ISOLATE_INVESTIGATE", label: "Isolate workstation and begin forensic investigation", color: "green" },
        { id: "REMOVE_USB", label: "Remove the USB and run an antivirus scan", color: "orange" },
        { id: "WARN_USER", label: "Warn the employee and return the workstation to service", color: "red" },
        { id: "REIMAGE_ONLY", label: "Reimage the workstation immediately", color: "yellow" },
      ],
      correctActionId: "ISOLATE_INVESTIGATE",
      rationales: [
        {
          id: "rat-isolate",
          text: "A confirmed HID attack with outbound C2 traffic requires immediate network isolation and forensic investigation to determine the scope of compromise before any remediation.",
        },
        {
          id: "rat-av",
          text: "Antivirus may not detect fileless attacks from keystroke injection — the payload already executed in memory and established a network connection.",
        },
        {
          id: "rat-reimage",
          text: "Reimaging destroys forensic evidence needed to understand what data was exfiltrated and whether lateral movement occurred.",
        },
        {
          id: "rat-warn",
          text: "The attack already succeeded — warning the user without containment leaves the compromised machine active on the network.",
        },
      ],
      correctRationaleId: "rat-isolate",
      feedback: {
        perfect:
          "Correct. This is a confirmed USB Rubber Ducky attack with active C2 communication. Immediate network isolation preserves forensic evidence while stopping lateral movement and data exfiltration. Investigation must determine the full blast radius before remediation begins.",
        partial:
          "You showed some security awareness, but your response either destroys evidence or fails to contain the active threat. A confirmed attack with outbound C2 traffic demands isolation first, then investigation.",
        wrong:
          "This workstation has an active command-and-control connection from a confirmed keystroke injection attack. Leaving it on the network or simply warning the user allows the attacker to continue operating. Immediate isolation and forensic investigation are required.",
      },
    },
    {
      type: "action-rationale",
      id: "usb-002",
      title: "Employee Plugged In Unknown USB Before Reporting",
      context:
        "An employee in the marketing department found a USB flash drive in the building lobby, plugged it into their workstation to 'see who it belongs to,' opened several files including a PDF and a Word document, then reported it to IT when the Word document asked them to enable macros. No EDR alert has fired yet.",
      displayFields: [
        { label: "Device Type", value: "USB Mass Storage — 16GB flash drive", emphasis: "normal" },
        { label: "Files Accessed", value: "resume.pdf, employee_directory.docm", emphasis: "warn" },
        { label: "Macro Prompt", value: "User reports macro enable prompt appeared — claims they declined", emphasis: "warn" },
        { label: "EDR Status", value: "No alerts triggered", emphasis: "normal" },
        { label: "Time Since Insertion", value: "~15 minutes", emphasis: "warn" },
      ],
      actions: [
        { id: "CONTAINMENT", label: "Disconnect from network, preserve USB, escalate to IR team", color: "green" },
        { id: "SCAN_RESUME", label: "Run a full antivirus scan and return to service if clean", color: "orange" },
        { id: "CONFISCATE_ONLY", label: "Confiscate the USB and log the incident", color: "yellow" },
        { id: "NO_ACTION", label: "No action needed — macros were not enabled and EDR is clean", color: "red" },
      ],
      correctActionId: "CONTAINMENT",
      rationales: [
        {
          id: "rat-contain",
          text: "The PDF could contain an exploit that executed silently without macros. Absence of an EDR alert does not mean absence of compromise — containment and professional analysis are warranted.",
        },
        {
          id: "rat-av-limit",
          text: "Antivirus may miss zero-day exploits embedded in PDFs. A clean scan provides false confidence when the threat may be undetectable by signatures.",
        },
        {
          id: "rat-confiscate",
          text: "Confiscating the USB addresses the device but ignores the workstation that already opened potentially malicious files.",
        },
        {
          id: "rat-no-alert",
          text: "EDR solutions are not infallible — sophisticated attacks can evade endpoint detection, especially PDF exploits that target reader vulnerabilities.",
        },
      ],
      correctRationaleId: "rat-contain",
      feedback: {
        perfect:
          "Excellent. Even without an EDR alert, the employee opened unknown files from a suspicious USB. PDFs can contain silent exploits, and the user's claim about declining macros cannot be verified. Network disconnection, evidence preservation, and IR escalation are the correct containment steps.",
        partial:
          "You took some precautions, but your response has gaps. The workstation itself may be compromised regardless of what the USB contains — opening unknown files from a found device is a potential compromise vector that requires proper investigation.",
        wrong:
          "A clean EDR dashboard does not equal a clean system. The employee opened files from an unknown USB found in a common area — a textbook drop attack scenario. The workstation needs containment and the USB needs forensic analysis.",
      },
    },
    {
      type: "action-rationale",
      id: "usb-003",
      title: "Branded USB from Vendor Conference",
      context:
        "An employee returned from a cybersecurity vendor conference with a branded USB drive containing product demos and whitepapers. They want to plug it into their work laptop to review the materials. The USB has the vendor's logo printed on it and was handed out at the vendor's booth.",
      displayFields: [
        { label: "Source", value: "CyberShield Inc. booth at RSA Conference", emphasis: "normal" },
        { label: "USB Branding", value: "Vendor logo, 'Product Demo 2026' printed on case", emphasis: "normal" },
        { label: "Vendor Relationship", value: "Active vendor — under NDA evaluation", emphasis: "normal" },
        { label: "Company USB Policy", value: "All external USB devices require IT approval before use", emphasis: "warn" },
      ],
      actions: [
        { id: "ALLOW_TRUSTED", label: "Allow it — the vendor is trusted and the conference is legitimate", color: "red" },
        { id: "SCAN_APPROVE", label: "Submit to IT for scanning and approval per policy", color: "green" },
        { id: "BLOCK_DESTROY", label: "Confiscate and destroy the USB immediately", color: "orange" },
        { id: "USE_SANDBOX", label: "Let the employee use it on an air-gapped sandbox machine", color: "yellow" },
      ],
      correctActionId: "SCAN_APPROVE",
      rationales: [
        {
          id: "rat-policy",
          text: "Company policy requires IT approval for all external USB devices regardless of source. Branded USBs from conferences have been used as attack vectors in supply chain compromises.",
        },
        {
          id: "rat-trust",
          text: "Physical branding on a USB proves nothing about its contents — supply chain attacks have targeted conference giveaways and vendor promotional materials.",
        },
        {
          id: "rat-destroy",
          text: "Destroying the USB is disproportionate for a likely legitimate device and damages the vendor relationship unnecessarily.",
        },
        {
          id: "rat-sandbox",
          text: "Sandbox analysis is reasonable but bypasses the IT approval workflow — policy compliance matters even when the risk appears low.",
        },
      ],
      correctRationaleId: "rat-policy",
      feedback: {
        perfect:
          "Correct. Even USBs from legitimate conferences must go through the IT approval process. Supply chain attacks have targeted conference giveaways before. Following policy ensures consistent security regardless of perceived trust level, while still allowing the employee to access the materials after verification.",
        partial:
          "You showed caution, but your approach either bypasses established policy or overreacts to a likely legitimate device. The IT scanning and approval process exists to handle exactly this situation — proportional response with proper verification.",
        wrong:
          "Trusting a USB based solely on branding and source is a security gap. Conference USB drives have been compromised in real-world supply chain attacks. Always follow the established USB approval policy, regardless of how trustworthy the source appears.",
      },
    },
  ],

  hints: [
    "A USB device that registers as a keyboard (HID) instead of storage is almost certainly a keystroke injection tool like a Rubber Ducky.",
    "The absence of an EDR alert does not confirm the absence of a threat — some exploits operate below detection thresholds.",
    "Company policy should be followed consistently. Even low-risk USB devices from trusted sources must go through the approval workflow.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "USB drop attacks remain one of the most effective physical social engineering techniques. In penetration testing, USB drops in parking lots achieve plug-in rates of 45-98%. Incident responders must treat every unknown USB as potentially hostile and follow containment procedures before analysis.",
  toolRelevance: [
    "CrowdStrike Falcon / Microsoft Defender for Endpoint (EDR)",
    "USBDeview (USB forensics)",
    "FTK Imager (forensic imaging)",
    "Volatility (memory forensics)",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
