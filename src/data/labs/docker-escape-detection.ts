import type { LabManifest } from "../../types/manifest";

export const dockerEscapeDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "docker-escape-detection",
  version: 1,
  title: "Docker Container Escape Detection",

  tier: "advanced",
  track: "detection-hunting",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["docker", "container-escape", "privilege-escalation", "linux", "cgroups", "forensics"],

  description:
    "Investigate suspicious container activity to identify container escape attempts using privileged mode abuse, mounted Docker socket exploitation, and cgroup release_agent techniques.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Identify container escape indicators in process and filesystem audit logs",
    "Distinguish privileged container abuse from legitimate container administration",
    "Select appropriate containment and remediation for confirmed container escapes",
  ],
  sortOrder: 580,

  status: "published",
  prerequisites: [],

  rendererType: "investigate-decide",

  scenarios: [
    {
      type: "investigate-decide",
      id: "docker-001",
      title: "Privileged Container with Host Filesystem Mount",
      objective:
        "Security monitoring flagged unusual process activity from a container. Investigate whether a container escape occurred.",
      investigationData: [
        {
          id: "container-config",
          label: "Container Configuration",
          content:
            "Container 'web-scraper-prod' started with: --privileged --pid=host -v /:/host. Running as root (UID 0). Image: company/scraper:latest. Started by CI/CD service account 'deploy-bot' 3 days ago.",
          isCritical: true,
        },
        {
          id: "process-audit",
          label: "Process Audit Log",
          content:
            "Inside container PID namespace: bash process spawned child 'chroot /host /bin/bash' at 02:14 UTC. Subsequent commands: cat /host/etc/shadow, crontab -e (writing to /host/etc/cron.d/backdoor), useradd -u 0 -o -g 0 svc-update /host.",
          isCritical: true,
        },
        {
          id: "filesystem-changes",
          label: "Host Filesystem Changes",
          content:
            "Files modified on HOST (not container): /etc/cron.d/backdoor (new, contains curl|bash download cradle), /etc/passwd (new user 'svc-update'), /tmp/.hidden/ (new directory with 3 ELF binaries).",
        },
        {
          id: "network-activity",
          label: "Network Activity",
          content:
            "Outbound connection from container IP to 185.220.101.47:443 at 02:16 UTC. DNS query: update.cdn-delivery[.]net. 4.2MB outbound transfer. Pattern matches known C2 infrastructure.",
        },
      ],
      actions: [
        {
          id: "KILL_ISOLATE_INVESTIGATE",
          label: "Kill container, isolate host, remove backdoor files, revoke deploy-bot credentials",
          color: "red",
        },
        {
          id: "KILL_CONTAINER",
          label: "Kill the container and restart without --privileged flag",
          color: "orange",
        },
        {
          id: "BLOCK_IP",
          label: "Block outbound IP and monitor for further activity",
          color: "yellow",
        },
        {
          id: "MONITOR_ONLY",
          label: "Monitor — the container has legitimate filesystem access for scraping",
          color: "blue",
        },
      ],
      correctActionId: "KILL_ISOLATE_INVESTIGATE",
      rationales: [
        {
          id: "rat-confirmed-escape",
          text: "This is a confirmed container escape with host compromise. The attacker used --privileged + host filesystem mount to chroot into the host, add a backdoor cron job, create a root-equivalent user, and beacon to C2. All four actions are required: kill the container (stop active attack), isolate the host (prevent C2 activity and lateral movement), remove backdoor files (three persistence mechanisms placed), and revoke deploy-bot credentials (the initial access vector).",
        },
        {
          id: "rat-kill-only",
          text: "Killing the container stops the immediate breach but the backdoor cron job, malicious user, and ELF binaries remain on the host. The attacker retains persistent access.",
        },
        {
          id: "rat-block-ip",
          text: "Blocking the C2 IP stops the beacon but doesn't address the host-level persistence or the root cause — a privileged container with full host access.",
        },
        {
          id: "rat-monitor",
          text: "Scraping tasks don't require --privileged, --pid=host, or full root filesystem access. No legitimate scraper needs to write to /etc/cron.d or /etc/passwd.",
        },
      ],
      correctRationaleId: "rat-confirmed-escape",
      feedback: {
        perfect: "Complete response. --privileged with host filesystem mount is effectively no container isolation. Treat this as a full host compromise: kill, isolate, clean persistence, revoke credentials.",
        partial: "You stopped part of the attack but missed host-level persistence. The backdoor cron entry and added user survive container termination and will re-establish access.",
        wrong: "The chroot into /host with subsequent /etc/ modifications is a confirmed container escape and host compromise. This requires immediate IR response, not monitoring.",
      },
    },
    {
      type: "investigate-decide",
      id: "docker-002",
      title: "Docker Socket Mount Exploitation",
      objective:
        "An application container has access to the Docker daemon socket. Investigate whether it has been used maliciously.",
      investigationData: [
        {
          id: "socket-evidence",
          label: "Docker Socket Mount",
          content:
            "Container 'ci-runner-03' has -v /var/run/docker.sock:/var/run/docker.sock. Docker API calls logged from container: GET /containers/json, POST /containers/create (image: alpine, binds: ['/:/mnt'], privileged: true), POST /containers/{id}/start.",
          isCritical: true,
        },
        {
          id: "new-container",
          label: "Spawned Container Activity",
          content:
            "New container created by ci-runner-03: image alpine:latest, mounts host root at /mnt, running as root. Commands executed: ls /mnt/etc, cat /mnt/etc/shadow, cp /mnt/root/.ssh/authorized_keys /mnt/tmp/keys_exfil.",
          isCritical: true,
        },
        {
          id: "runner-context",
          label: "CI Runner Context",
          content:
            "ci-runner-03 is a GitLab CI runner. Current pipeline job: 'build-frontend' for repo 'marketing/website'. The pipeline YAML does not contain Docker-in-Docker steps. Malicious .gitlab-ci.yml was injected via compromised developer account.",
        },
        {
          id: "developer-account",
          label: "Developer Account Status",
          content:
            "Developer account 'jsmith' was used to push the malicious pipeline file. Account shows login from unfamiliar IP (188.42.97.11, Romania) 40 minutes before the push. jsmith's normal login pattern is US-based.",
        },
      ],
      actions: [
        {
          id: "FULL_RESPONSE",
          label: "Kill spawned container, suspend jsmith, remove socket mount from runner config, rotate SSH keys",
          color: "red",
        },
        {
          id: "KILL_CONTAINERS",
          label: "Kill both containers and rebuild the CI runner",
          color: "orange",
        },
        {
          id: "SUSPEND_USER",
          label: "Suspend jsmith and investigate account compromise",
          color: "yellow",
        },
        {
          id: "REVOKE_PIPELINE",
          label: "Cancel the pipeline run and revert the .gitlab-ci.yml",
          color: "blue",
        },
      ],
      correctActionId: "FULL_RESPONSE",
      rationales: [
        {
          id: "rat-docker-socket",
          text: "Docker socket access is equivalent to root on the host — any container with socket access can spawn privileged containers mounting the host filesystem. The full response addresses all attack vectors: kill the exfiltration container (active data theft), suspend jsmith (compromised account used as initial access), remove socket mount from runner config (eliminate the privilege escalation path), and rotate SSH keys on host (authorized_keys were copied by the attacker).",
        },
        {
          id: "rat-kill-only",
          text: "Rebuilding the runners doesn't address the compromised developer account, which still has push access to inject malicious pipelines. The SSH keys already exfiltrated also need rotation.",
        },
        {
          id: "rat-suspend-only",
          text: "Suspending jsmith is necessary but the spawned container is still running and exfiltrating data. Immediate containment takes priority.",
        },
        {
          id: "rat-revert-pipeline",
          text: "Reverting the pipeline stops future runs but the malicious container from the current run is already executing. Stopping the active exfiltration is the immediate priority.",
        },
      ],
      correctRationaleId: "rat-docker-socket",
      feedback: {
        perfect: "Correct. Docker socket mount = host root equivalent. The attack chain is clear: compromised dev account → malicious CI pipeline → socket abuse → privileged container → host filesystem access. Address every link.",
        partial: "You stopped part of the attack chain. Address both the active exfiltration (kill container) and the initial access vector (compromised account + SSH key rotation).",
        wrong: "Revoking the pipeline doesn't stop the already-running malicious container. Containers with Docker socket access are not isolated from the host.",
      },
    },
    {
      type: "investigate-decide",
      id: "docker-003",
      title: "False Positive — Docker-in-Docker Legitimate Use",
      objective:
        "WAF/EDR alert on a container spawning child containers. Determine if this is a genuine escape attempt or legitimate infrastructure.",
      investigationData: [
        {
          id: "alert-details",
          label: "Security Alert",
          content:
            "EDR alert: Container 'jenkins-agent-dind-07' creating new containers via Docker API. Rule: CONTAINER_SPAWN_CHILD. Severity: High. Container has access to Docker socket.",
        },
        {
          id: "job-context",
          label: "Jenkins Job Context",
          content:
            "Jenkins pipeline: 'Build & Test — payments-service'. Stage: 'docker build && docker run tests'. Pipeline is defined in payments-service/Jenkinsfile, reviewed and approved 6 months ago. Uses Docker-in-Docker (DinD) pattern — standard for this CI environment.",
        },
        {
          id: "socket-config",
          label: "Docker Socket Configuration",
          content:
            "The jenkins-agent-dind-07 class is specifically configured with Docker socket access for DinD builds. This is documented in the CI/CD runbook as the approved build agent configuration for containerized test pipelines. Namespace is isolated: only the 'ci-builds' network, no access to production networks.",
        },
        {
          id: "spawned-containers",
          label: "Spawned Container Analysis",
          content:
            "New containers created: payments-service:test-build-449, postgres:14-alpine (test DB), redis:7-alpine (test cache). All containers in isolated 'ci-builds' Docker network. No host mounts. No privileged flag. Containers deleted after 4-minute test run.",
        },
      ],
      actions: [
        {
          id: "DOCUMENT_TUNE",
          label: "Mark as false positive, tune alert to exclude approved DinD agents",
          color: "green",
        },
        {
          id: "REVOKE_SOCKET",
          label: "Remove Docker socket access — DinD is too risky for any CI use",
          color: "red",
        },
        {
          id: "INVESTIGATE_PIPELINE",
          label: "Investigate the Jenkinsfile for malicious modifications",
          color: "orange",
        },
        {
          id: "SUSPEND_AGENT",
          label: "Suspend the jenkins-agent class pending security review",
          color: "yellow",
        },
      ],
      correctActionId: "DOCUMENT_TUNE",
      rationales: [
        {
          id: "rat-legitimate-dind",
          text: "This is legitimate Docker-in-Docker use in an approved CI context. The key indicators of benign activity: the containers spawned match the expected build pattern (app + test deps), no host mounts, no privileged flag, network isolation to ci-builds only, all containers ephemeral and removed after test completion. The EDR rule correctly triggers on socket access but the approved DinD agent class is a known exception that should be tuned out.",
        },
        {
          id: "rat-revoke-socket",
          text: "While Docker socket access is powerful, it's a standard and accepted pattern for CI environments with appropriate isolation. Revoking it would break all containerized build pipelines with no security benefit — the isolation controls are already in place.",
        },
        {
          id: "rat-investigate-pipeline",
          text: "The Jenkinsfile is approved and the spawned containers match the expected build pattern exactly. Investigate when there are anomalies — unexpected images, unexpected mounts, or unexpected network destinations.",
        },
        {
          id: "rat-suspend-agent",
          text: "Suspending all DinD agents would halt all containerized CI builds organization-wide. The activity matches documented and approved behavior.",
        },
      ],
      correctRationaleId: "rat-legitimate-dind",
      feedback: {
        perfect: "Good judgment. Docker socket access in CI for DinD builds is a documented and widely-used pattern. The absence of host mounts, privileged flags, and production network access confirms this is legitimate. Tune the alert to prevent alert fatigue.",
        partial: "Your caution is reasonable, but the existing isolation controls (no host mounts, no privileged, isolated network) address the DinD risk. Understand your approved CI patterns before raising alarms.",
        wrong: "Not all container-spawning behavior is malicious. Approved DinD CI agents with proper isolation are a standard pattern. Context and isolation controls matter.",
      },
    },
  ],

  hints: [
    "--privileged combined with host filesystem mounts (-v /:/host) is equivalent to root shell on the host — any process inside can chroot to the host and modify it directly.",
    "Docker socket access (/var/run/docker.sock) gives a container full Docker API access, including the ability to spawn new privileged containers with host mounts.",
    "Legitimate Docker-in-Docker CI patterns use isolated networks, no host mounts, and no privileged flags — these controls distinguish approved DinD from container escape abuse.",
  ],

  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },

  careerInsight:
    "Container escapes are a critical concern in cloud-native environments. Understanding which container configurations eliminate isolation (--privileged, socket mounts, host PID namespace) is essential for cloud security and DevSecOps roles.",
  toolRelevance: [
    "Falco (container runtime security)",
    "Trivy (container image scanning)",
    "Docker Bench for Security",
    "Sysdig Secure",
  ],

  createdAt: "2026-03-27",
  updatedAt: "2026-03-27",
};
