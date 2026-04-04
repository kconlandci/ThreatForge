import type { LabManifest } from "../../types/manifest";

export const wirelessRogueApDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "wireless-rogue-ap-detection",
  version: 1,
  title: "Wireless Rogue AP Detection",

  tier: "intermediate",
  track: "network-defense",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["wireless", "rogue-ap", "802.11", "wids", "network-security"],

  description:
    "Investigate wireless intrusion detection alerts to identify rogue access points, distinguish them from legitimate infrastructure, and determine appropriate containment actions.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Analyze WIDS alerts to identify rogue access points on the network",
    "Distinguish rogue APs from authorized infrastructure using BSSID and signal analysis",
    "Determine appropriate containment actions for unauthorized wireless devices",
  ],
  sortOrder: 320,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "wrap-001",
      title: "Unknown AP Broadcasting Corporate SSID",
      objective:
        "WIDS triggered an alert for an unrecognized access point. Investigate whether it poses a threat.",
      investigationData: [
        {
          id: "wids-alert",
          label: "WIDS Alert Details",
          content:
            'SSID: "CorpNet-Secure" (matches corporate SSID). BSSID: AA:BB:CC:11:22:33 — not found in the authorized AP inventory. Channel 6, signal strength -45dBm (strong, indicating physical proximity).',
          isCritical: true,
        },
        {
          id: "switch-trace",
          label: "Network Switch Port Trace",
          content:
            "MAC address AA:BB:CC:11:22:33 found on switch port Gi1/0/24 in Conference Room B. The port is configured for data VLAN access — no 802.1X enforcement on this port.",
          isCritical: true,
        },
        {
          id: "ap-vendor",
          label: "Vendor OUI Lookup",
          content:
            'MAC prefix AA:BB:CC maps to "TP-Link Technologies" — the corporate standard is Aruba Networks. This is a consumer-grade device.',
        },
        {
          id: "client-count",
          label: "Connected Clients",
          content:
            "3 corporate devices currently associated with this AP. Their traffic is bridged directly onto the corporate VLAN without any WPA3-Enterprise authentication.",
        },
      ],
      actions: [
        {
          id: "DISABLE_PORT",
          label: "Disable switch port and physically locate device",
          color: "red",
        },
        {
          id: "MONITOR_AP",
          label: "Monitor the AP for 24 hours",
          color: "orange",
        },
        {
          id: "ADD_INVENTORY",
          label: "Add to AP inventory — probably new equipment",
          color: "blue",
        },
        {
          id: "BLOCK_CLIENTS",
          label: "Block the connected clients only",
          color: "yellow",
        },
      ],
      correctActionId: "DISABLE_PORT",
      rationales: [
        {
          id: "rat-rogue-confirmed",
          text: "An unauthorized consumer AP broadcasting the corporate SSID on the corporate network is a textbook rogue AP. It bypasses WPA3-Enterprise authentication and bridges unauthenticated traffic onto the VLAN. Disabling the port immediately stops the exposure while physical location enables removal.",
        },
        {
          id: "rat-monitor",
          text: "Monitoring for 24 hours leaves corporate devices connected to an unauthenticated bridge, exposing them to man-in-the-middle attacks the entire time.",
        },
        {
          id: "rat-add-inventory",
          text: "Adding an unknown consumer device to the authorized inventory without investigation would legitimize an unauthorized access point.",
        },
        {
          id: "rat-block-clients",
          text: "Blocking clients only addresses the symptom — the rogue AP remains active and will attract new connections.",
        },
      ],
      correctRationaleId: "rat-rogue-confirmed",
      feedback: {
        perfect:
          "Correct. An unauthorized TP-Link AP broadcasting the corporate SSID and bridging traffic without WPA3-Enterprise is a confirmed rogue AP. Disabling the switch port is immediate containment, and physical location enables permanent removal.",
        partial:
          "You recognized the risk but chose an incomplete response. The rogue AP needs to be disabled at the network level immediately — monitoring or client blocking leaves the vulnerability open.",
        wrong:
          "Adding an unknown consumer AP to inventory or ignoring the alert would formalize a major security gap. This AP bypasses all wireless authentication controls.",
      },
    },
    {
      type: "investigate-decide",
      id: "wrap-002",
      title: "Neighbor's AP Signal Bleed",
      objective:
        "WIDS flagged an unknown AP. Determine if it is a threat to the corporate network.",
      investigationData: [
        {
          id: "ap-details",
          label: "Detected AP Details",
          content:
            'SSID: "CoffeeShop_FreeWifi". BSSID: DD:EE:FF:44:55:66. Channel 11, signal strength -85dBm (very weak, indicating distance). WPA2-Personal encryption.',
        },
        {
          id: "network-presence",
          label: "Network Infrastructure Check",
          content:
            "MAC address DD:EE:FF:44:55:66 is NOT present on any corporate switch port. No wired connection to the corporate network detected.",
        },
        {
          id: "client-check",
          label: "Corporate Client Association",
          content:
            "Zero corporate managed devices are connected to this AP. No company endpoints have ever associated with this SSID based on 30 days of WIDS logs.",
        },
        {
          id: "location-context",
          label: "Physical Location Context",
          content:
            "The building shares a wall with a coffee shop at street level. Signal is strongest near the west-facing windows on the first floor.",
        },
      ],
      actions: [
        {
          id: "DOCUMENT_WHITELIST",
          label: "Document as known neighbor and suppress alerts",
          color: "green",
        },
        {
          id: "DEAUTH_ATTACK",
          label: "Send deauthentication frames to disrupt it",
          color: "red",
        },
        {
          id: "BLOCK_SSID",
          label: "Block the SSID at the corporate firewall",
          color: "orange",
        },
        {
          id: "REPORT_POLICE",
          label: "Report to building management as a threat",
          color: "yellow",
        },
      ],
      correctActionId: "DOCUMENT_WHITELIST",
      rationales: [
        {
          id: "rat-neighbor",
          text: "A weak signal from a non-corporate SSID with no wired presence and no corporate client connections is a neighboring business's AP. Documenting and suppressing future alerts reduces noise without any security risk.",
        },
        {
          id: "rat-deauth",
          text: "Sending deauth frames against a neighbor's legitimate network is illegal in most jurisdictions and could constitute a denial-of-service attack.",
        },
        {
          id: "rat-block",
          text: "Blocking an SSID at the firewall has no effect — the AP isn't on your network. SSID filtering only works on managed endpoints.",
        },
        {
          id: "rat-report",
          text: "A coffee shop's Wi-Fi is not a security threat. Reporting it wastes building management's time and damages your team's credibility.",
        },
      ],
      correctRationaleId: "rat-neighbor",
      feedback: {
        perfect:
          "Good judgment. Weak signal, non-corporate SSID, no network presence, no client associations — this is clearly a neighboring business. Documenting it prevents future alert fatigue.",
        partial:
          "Your caution is understandable but the response is disproportionate. Not every unknown AP is a threat. Evaluate signal strength, network presence, and client connections before acting.",
        wrong:
          "Deauthenticating a neighbor's network is illegal and unethical. Always assess the actual risk before taking aggressive action against wireless signals.",
      },
    },
    {
      type: "investigate-decide",
      id: "wrap-003",
      title: "Facilities-Installed AP Without IT Approval",
      objective:
        "A new AP appeared on the network after a weekend facilities project. Investigate.",
      investigationData: [
        {
          id: "ap-info",
          label: "Access Point Details",
          content:
            'SSID: "CorpNet-Secure". BSSID: 00:1A:2B:3C:4D:5E — OUI matches Aruba Networks (corporate standard vendor). Channel 36 (5GHz), signal strength -50dBm. Broadcasting WPA3-Enterprise.',
        },
        {
          id: "switch-info",
          label: "Switch Port Information",
          content:
            "Connected to switch port Gi2/0/15 in the new Executive Boardroom. Port is on the AP management VLAN. 802.1X passed but the device is not in Aruba Central inventory.",
        },
        {
          id: "facilities-check",
          label: "Facilities Work Order",
          content:
            'Work order #WO-2026-0847: "Install network drops and wireless coverage in Executive Boardroom renovation." Completed Saturday. No IT security review was included in the work order.',
        },
        {
          id: "config-check",
          label: "AP Configuration Audit",
          content:
            "AP is running factory default configuration with Aruba Instant firmware. Default admin credentials have not been changed. No corporate security policies applied.",
        },
      ],
      actions: [
        {
          id: "ONBOARD_AP",
          label: "Verify with facilities, onboard to Aruba Central properly",
          color: "green",
        },
        {
          id: "DISABLE_REMOVE",
          label: "Disable immediately and remove from network",
          color: "red",
        },
        {
          id: "CHANGE_DEFAULTS",
          label: "Change default credentials and leave running",
          color: "orange",
        },
        {
          id: "APPROVE_AS_IS",
          label: "Approve as-is — it's the right vendor",
          color: "blue",
        },
      ],
      correctActionId: "ONBOARD_AP",
      rationales: [
        {
          id: "rat-onboard",
          text: "The AP is legitimate hardware installed by facilities but needs proper IT onboarding — firmware update, default credential change, corporate policy application, and addition to Aruba Central inventory. Verifying with facilities confirms intent while proper onboarding ensures security.",
        },
        {
          id: "rat-disable",
          text: "Immediately disabling a facilities-approved installation creates friction between departments. The device is legitimate but needs configuration.",
        },
        {
          id: "rat-defaults",
          text: "Changing defaults alone is insufficient — the AP needs full corporate policy application, firmware updates, and inventory registration.",
        },
        {
          id: "rat-approve",
          text: "Approving an AP with factory defaults and unchanged admin credentials creates a security gap regardless of the vendor.",
        },
      ],
      correctRationaleId: "rat-onboard",
      feedback: {
        perfect:
          "Well handled. The AP is legitimate Aruba hardware from an authorized facilities project but needs proper IT onboarding. Verifying with facilities builds cross-department trust while ensuring security standards are met.",
        partial:
          "You're on the right track but your response is either too aggressive or too lenient. The AP needs proper onboarding — not removal and not approval with factory defaults.",
        wrong:
          "Approving an AP with default credentials or removing legitimate facilities equipment both cause problems. Proper onboarding is the balanced approach.",
      },
    },
  ],

  hints: [
    "Check the BSSID vendor OUI against your authorized AP inventory — consumer-grade devices on a corporate network are red flags.",
    "Signal strength and network switch presence help distinguish local rogue APs from distant neighbor interference.",
    "Not every unrecognized AP is malicious — facilities, events, and neighbors can all trigger WIDS alerts.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Wireless security assessments are critical in environments handling sensitive data. Understanding WIDS alerts and rogue AP identification is essential for network security roles.",
  toolRelevance: [
    "Kismet",
    "Aruba WIDS/AirWave",
    "Cisco Wireless IPS",
    "WiFi Analyzer",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
