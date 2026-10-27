# PLAN_DEVSECOPS.md — Parte VII: Blue Team y DevSecOps (M54–M61 + Checkpoint G) y serie SEC

> Plan autosuficiente para la Parte VII y su serie de guías prácticas (SEC00–SEC08). Lo que cambia (qué está
> hecho) vive en `PROGRESO.md`; las reglas estables en `CLAUDE.md`; el currículo global en `PLAN.md`.
> Pedido del usuario (2026-10-25): "agrega todo eso al plan y ve creando los módulos de teoría primero, hazlo en
> batches de 4 en 4, lo mismo para la parte práctica".

---

## 0. Por qué esta parte

La Parte IV enseña a **prevenir**: firewalls, hardening, bases, criptografía, nube y Active Directory. Lo que el
curso no cubría (búsqueda en `modules/` y `proyectos/` del 2026-10-25, cero resultados): threat modeling como
práctica, el ciclo de vida seguro del software, la cadena de suministro (SBOM, SLSA, firmas), contenedores y
Kubernetes, gestión de vulnerabilidades (CVSS, EPSS, KEV), detection engineering (Sigma, ATT&CK, SIEM),
respuesta a incidentes con forense, y seguridad del correo. Esta parte completa el ciclo: **prevenir, detectar,
responder y asegurar el pipeline que produce el software**.

Decisiones tomadas por defecto (el usuario no eligió; se pueden cambiar):

- **Parte VII nueva**, no extensión de la Parte IV: la Parte IV quedó cerrada con su checkpoint. Va al final de
  la ruta, después de la Parte VI, y **cuenta para el progreso**. Id `p7`, línea `--line-p7: var(--l-client)`.
- **Numeración:** M54 a M61 y el Checkpoint G (`cpg`). M40 y M41 siguen reservados para pagos; M47–M53 y CP-F
  para la Parte VI.
- **SIEM de la serie SEC:** Wazuh en un solo nodo (SIEM real con decoders, reglas, FIM y respuesta activa).
  Alternativa liviana documentada en SEC00: Loki + Grafana, reusando lo de A14. Se confirma con el usuario antes
  del bloque práctico.
- **Orden de trabajo, en bloques de cuatro:**
  1. Teoría, bloque 1: M54, M55, M56 y M57.
  2. Teoría, bloque 2: M58, M59, M60 y M61; después el Checkpoint G.
  3. Práctica, bloque 1: SEC00, SEC01, SEC02 y SEC03.
  4. Práctica, bloque 2: SEC04, SEC05, SEC06 y SEC07; después SEC08.

## 1. Principios transversales

### 1.1. Restricción de seguridad (igual que la Parte IV, no negociable)

Todo es **defensivo**. Cada tema muestra el patrón vulnerable y su arreglo, nunca una cadena de explotación lista
para usar ni técnicas de evasión. Los ataques se nombran a nivel de concepto, con el rastro que dejan y la
defensa. En la serie SEC, las técnicas se **simulan solo contra el laboratorio propio** (la víctima de SEC00),
con herramientas de emulación pensadas para defensores (Atomic Red Team, pruebas de reglas de Falco), para
generar señal que detectar. Nada de payloads contra terceros.

### 1.2. Honestidad técnica

`badge--doc` para lo que tiene fuente pública; `badge--ref` para las reconstrucciones. Cifras verificadas y
ejemplos con la cuenta hecha. En las guías, nunca se inventan salidas: se dice qué comando correr y qué tiene que
aparecer.

### 1.3. Hilo conductor

Un solo sistema de ejemplo cruza toda la parte: **"Tienda Norte"**, una tienda en línea con una API en Java
(la de A02), una base PostgreSQL, Redis, un worker de pagos (M39), un frontend y su pipeline en GitHub Actions
que publica imágenes a un registro y despliega en Kubernetes. M54 la modela, M55 revisa su código, M56 su
cadena de suministro, M57 su clúster, M58 sus hallazgos, M59 sus detecciones, M60 su incidente y M61 su red y
correo. El CP-G pide diseñar el blue team de una startup parecida.

## 2. Índice

| # | Módulo | Id de archivo | Min | Widget | Ejercicio guiado |
|---|---|---|---|---|---|
| M54 | Threat modeling práctico | `m54-threat-modeling.html` | 100 | `data-sim="stride"` | `m54-stride` |
| M55 | Seguridad en el ciclo de vida del software (AppSec) | `m55-appsec.html` | 130 | `data-sim="appsecpipe"` | `m55-pipeline` |
| M56 | La cadena de suministro de software | `m56-supply-chain.html` | 130 | `data-sim="supplychain"` | `m56-cadena` |
| M57 | Seguridad de contenedores y Kubernetes | `m57-contenedores-k8s.html` | 140 | `data-sim="podsec"` | `m57-cluster` |
| M58 | Gestión de vulnerabilidades | `m58-vulnerabilidades.html` | 100 | `data-sim="vulnprio"` | `m58-backlog` |
| M59 | Detection engineering y el SOC | `m59-deteccion.html` | 140 | `data-sim="detrule"` | `m59-reglas` |
| M60 | Respuesta a incidentes y forense | `m60-respuesta-forense.html` | 140 | mapa `m60-incidente` | `m60-incidente` |
| M61 | Seguridad de red y del correo | `m61-red-correo.html` | 100 | `data-sim="dmarc"` | `m61-dominio` |
| CP-G | Checkpoint G: el blue team de una startup | `checkpoint-g.html` | 90 | — | estático largo |

Los widgets de la parte viven en `assets/js/widgets/sim-devsecops.js` (M54–M57) y `sim-blueteam.js` (M58–M61),
con la lógica en `SD.devsecCore` y `SD.blueCore`.

## 3. Módulos

### M54 — Threat modeling práctico

**Encaje.** Abre la parte. Retoma el modelo de amenazas de M10.1 (`m10#basicos`), la superficie de ataque de
M33.1 y las fronteras de M37. Promete: M55 (las amenazas se convierten en requisitos y pruebas), M56 (la
cadena de suministro como frontera), M59 (las amenazas guían qué detectar).

**Secciones.** 54.1 `#por-que` las cuatro preguntas de Shostack; 54.2 `#dfd` el diagrama de flujo de datos
(entidades, procesos, almacenes, flujos y fronteras de confianza); 54.3 `#stride` STRIDE y su tabla por
elemento; 54.4 `#arboles` árboles de ataque; 54.5 `#priorizar` priorizar sin DREAD (probabilidad × impacto,
riesgo residual, aceptar, mitigar, transferir, evitar); 54.6 `#privacidad` LINDDUN en una página; 54.7
`#proceso` cuándo y cómo se hace (en el design doc, en cada cambio de frontera, threat modeling como código);
54.8 `#tienda` el modelo completo de Tienda Norte; 54.9 `#errores` errores típicos.

**Figuras.** Lámina 54.A (vocabulario); 54.1 las cuatro preguntas en ciclo; 54.2 los cinco símbolos del DFD;
54.3 DFD de Tienda Norte con tres fronteras; 54.4 STRIDE contra la propiedad que viola; 54.5 tabla STRIDE por
elemento como rejilla; 54.6 árbol de ataque "leer pedidos de otro cliente" con AND/OR; 54.7 matriz de riesgo
3×3; 54.8 el modelo en el ciclo de vida.

**Widget `stride`.** El DFD de Tienda Norte; al tocar un elemento muestra qué letras de STRIDE aplican según su
tipo (tabla de Microsoft) y, para ese elemento, la amenaza concreta y su mitigación; un contador de amenazas
mitigadas.

**Quiz (9).** Las cuatro preguntas, qué es una frontera de confianza, qué letra viola cada propiedad, por qué un
almacén no sufre spoofing en la tabla por elemento, AND contra OR en un árbol, por qué no DREAD, riesgo
residual, cuándo rehacer el modelo, LINDDUN.

**Términos.** `threat-modeling`, `stride`, `dfd`, `frontera-confianza`, `arbol-ataque`, `riesgo-residual`,
`linddun`. Retoma `superficie-ataque`, `bola`, `ssrf`.

**Fuentes.** Shostack, *Threat Modeling: Designing for Security* (2014) y "The Four Question Framework" (2024);
Threat Modeling Manifesto (2020); Microsoft, STRIDE (Kohnfelder y Garg, 1999) y la tabla por elemento; Schneier,
"Attack Trees" (Dr. Dobb's, 1999); LINDDUN (KU Leuven); OWASP Threat Dragon; la retirada de DREAD en Microsoft.

### M55 — Seguridad en el ciclo de vida del software (AppSec)

**Encaje.** Retoma M10.8 (BOLA, BFLA, SQLi, XSS y CSRF, JWT) sin repetirlo: aquí se ve **dónde** se atrapa cada
falla en el ciclo de vida. Retoma M54 (amenazas a requisitos). Promete: M56 (SCA a fondo), M58 (qué hacer con
los hallazgos), A19/SEC01 (el pipeline).

**Secciones.** 55.1 `#sdlc` el ciclo de vida seguro y el costo de encontrar tarde (NIST SSDF); 55.2 `#top10`
OWASP Top 10:2025 y API Top 10:2023, con lo que ya cubre M10; 55.3 `#requisitos` de amenazas a requisitos
(ASVS 5.0) y casos de abuso; 55.4 `#sast` análisis estático, fuentes y sumideros, falsos positivos; 55.5 `#sca`
dependencias con vulnerabilidades (Log4Shell como caso); 55.6 `#secretos` secret scanning, pre-commit y push
protection; 55.7 `#dast` análisis dinámico e IAST; 55.8 `#pipeline` dónde va cada herramienta y qué bloquea;
55.9 `#casos` cuatro fallas de Tienda Norte (SSRF, deserialización, mass assignment, path traversal) con el
patrón y el arreglo; 55.10 `#cultura` security champions, revisión de código y métricas.

**Widget `appsecpipe`.** Ocho fallas plantadas en Tienda Norte; el lector activa herramientas (revisión,
SAST, SCA, secret scanning, DAST, IAST, WAF) y ve cuál atrapa cada falla, en qué etapa y cuánto cuesta
arreglarla ahí (costo relativo didáctico, marcado como supuesto).

**Términos.** `sdlc-seguro`, `sast`, `dast`, `sca`, `iast`, `secret-scanning`, `asvs`, `security-champion`,
`path-traversal`, `deserializacion-insegura`.

**Fuentes.** OWASP Top 10:2025; OWASP API Security Top 10:2023; OWASP ASVS 5.0; NIST SP 800-218 (SSDF);
CVE-2021-44228 (Log4Shell, CVSS 10.0, diciembre de 2021); documentación de Semgrep, CodeQL, ZAP, gitleaks y del
push protection de GitHub.

### M56 — La cadena de suministro de software

**Encaje.** Retoma M36 (firmas, PKI, hash) y M55 (SCA). Promete: M57 (verificar firmas en la admisión), SEC02.

**Secciones.** 56.1 `#cadena` de la fuente al clúster: dónde se puede meter alguien; 56.2 `#casos` SolarWinds,
xz-utils, tj-actions y Shai-Hulud; 56.3 `#dependencias` lockfiles, hashes, typosquatting y dependency confusion;
56.4 `#ci` el pipeline como blanco: acciones fijadas por SHA, permisos del `GITHUB_TOKEN`, OIDC en lugar de
llaves, `pull_request_target`; 56.5 `#sbom` SBOM con SPDX y CycloneDX, VEX; 56.6 `#slsa` SLSA y la provenance;
56.7 `#firmas` Sigstore: Fulcio, Rekor y cosign sin llaves; 56.8 `#verificar` verificar antes de desplegar;
56.9 `#tienda` la cadena de Tienda Norte endurecida.

**Widget `supplychain`.** Seis eslabones (fuente, dependencias, CI, artefacto, registro, despliegue), seis
ataques y ocho controles; el lector activa controles y ve qué ataques quedan sin cortar y en qué eslabón.

**Términos.** `supply-chain`, `sbom`, `slsa`, `provenance`, `sigstore`, `lockfile`, `typosquatting`,
`dependency-confusion`, `vex`, `oidc-ci`.

**Fuentes.** CISA sobre tj-actions (CVE-2025-30066, 18 de marzo de 2025) y Shai-Hulud (23 de septiembre de 2025,
más de 500 paquetes); CVE-2024-3094 (xz 5.6.0 y 5.6.1, 29 de marzo de 2024, Andres Freund); Birsan, dependency
confusion (9 de febrero de 2021, más de 35 organizaciones); SLSA v1.1 (niveles de build L1–L3); Sigstore;
SPDX y CycloneDX; NTIA, elementos mínimos del SBOM (2021); SolarWinds (CISA, diciembre de 2020).

### M57 — Seguridad de contenedores y Kubernetes

**Encaje.** Retoma A07 (Kubernetes), M33.7 (contener un servicio), M37 (IAM, red), M56 (firmas). Promete: M59
(Falco como fuente de detección), SEC04.

**Secciones.** 57.1 `#contenedor` qué aísla un contenedor: namespaces, cgroups, capabilities, seccomp, y qué
no; 57.2 `#imagen` imágenes mínimas, usuario no root, multi-stage, escaneo; 57.3 `#escapes` escapes conocidos a
nivel de concepto (runc 2019 y Leaky Vessels 2024) y por qué se parchea el runtime; 57.4 `#pss` Pod Security
Standards y Pod Security Admission; 57.5 `#rbac-k8s` RBAC de Kubernetes y service accounts; 57.6 `#red-k8s`
NetworkPolicy con deny por defecto; 57.7 `#secretos-k8s` los Secrets no están cifrados por defecto, cifrado en
reposo y gestores externos; 57.8 `#admision` políticas de admisión (ValidatingAdmissionPolicy, Kyverno, OPA
Gatekeeper) y verificar firmas; 57.9 `#runtime` detección en ejecución con Falco; 57.10 `#capas` el clúster
de Tienda Norte capa por capa.

**Widget `podsec`.** Un pod con ocho campos que se activan; lo evalúa contra los niveles privileged, baseline y
restricted de los Pod Security Standards y dice qué ganaría alguien con ejecución de código dentro.

**Términos.** `namespaces-linux`, `cgroups`, `capabilities-linux`, `seccomp`, `pod-security-standards`,
`network-policy`, `admission-controller`, `falco`, `distroless`, `escape-contenedor`.

**Fuentes.** Documentación de Kubernetes (Pod Security Standards, PSA estable en 1.25, ValidatingAdmissionPolicy
GA en 1.30, Secrets y cifrado en reposo, NetworkPolicy); CVE-2019-5736 y CVE-2024-21626 (runc < 1.1.12, CVSS
8.6); CNCF, graduación de Falco (29 de febrero de 2024); NSA/CISA Kubernetes Hardening Guide; CIS Kubernetes
Benchmark.

### M58 — Gestión de vulnerabilidades

**Secciones.** 58.1 `#ciclo` descubrir, priorizar, arreglar, verificar; 58.2 `#cve` CVE, CWE, NVD y los
avisos de los proveedores; 58.3 `#cvss` CVSS 4.0 (qué mide y qué no); 58.4 `#epss` EPSS, probabilidad de
explotación; 58.5 `#kev` el catálogo KEV de CISA; 58.6 `#priorizar` combinar severidad, explotación,
exposición y criticidad del activo; 58.7 `#sla` SLA de parcheo y excepciones con vencimiento; 58.8 `#ruido`
falsos positivos, VEX y alcanzabilidad; 58.9 `#metricas` MTTR, deuda y cobertura; 58.10 `#tienda` 4 000
hallazgos de Tienda Norte.

**Widget `vulnprio`.** Veinte hallazgos sintéticos con CVSS, EPSS, KEV, exposición y criticidad; tres
políticas de priorización (solo CVSS, CVSS + KEV, riesgo combinado) y cuánto riesgo se cierra con la misma
capacidad de arreglo por semana.

**Términos.** `cve`, `cwe`, `cvss`, `epss`, `kev`, `sla-parcheo`, `alcanzabilidad`.

**Fuentes.** FIRST (CVSS 4.0, EPSS), CISA KEV y BOD 22-01, NVD, MITRE CVE/CWE.

### M59 — Detection engineering y el SOC

**Secciones.** 59.1 `#soc` qué hace un SOC y el ciclo de una alerta; 59.2 `#fuentes` qué registrar (auth,
procesos, red, nube, Kubernetes, aplicación) y cuánto cuesta; 59.3 `#pipeline-logs` recolectar, normalizar
(ECS u OCSF), enriquecer y guardar; 59.4 `#siem` SIEM y retención; 59.5 `#attack` MITRE ATT&CK como mapa de
cobertura; 59.6 `#sigma` reglas Sigma; 59.7 `#detection-as-code` reglas versionadas con pruebas y despliegue;
59.8 `#calidad` precisión, recall y fatiga de alertas (la pirámide del dolor); 59.9 `#hunting` caza de
amenazas (retoma M32); 59.10 `#tienda` las primeras diez detecciones de Tienda Norte.

**Widget `detrule`.** Un flujo de 40 eventos (con dos ataques simulados); el lector ajusta una regla (campos,
umbral, ventana, exclusiones) y ve verdaderos y falsos positivos, lo que se escapa y la carga de alertas por día.

**Términos.** `soc`, `siem`, `sigma`, `mitre-attack`, `detection-as-code`, `fatiga-alertas`, `ioc`, `ttp`,
`edr`, `piramide-dolor`.

**Fuentes.** MITRE ATT&CK; SigmaHQ; Bianco, "The Pyramid of Pain" (2013); OCSF; Elastic Common Schema; Palantir,
"Alerting and Detection Strategy Framework" (2017).

### M60 — Respuesta a incidentes y forense

**Secciones.** 60.1 `#marco` NIST SP 800-61r3 y el ciclo (retoma M37.8 y M11.8); 60.2 `#preparar` roles,
canales, playbooks y ejercicios de mesa; 60.3 `#triaje` severidad y alcance; 60.4 `#contener` contener sin
destruir evidencia; 60.5 `#evidencia` orden de volatilidad y cadena de custodia; 60.6 `#linux` artefactos de
Linux (auth.log, journald, auditd, bash_history, cron, systemd); 60.7 `#nube-k8s` artefactos de nube y
Kubernetes (CloudTrail, audit log del API server); 60.8 `#timeline` armar la línea de tiempo; 60.9
`#erradicar` erradicar y recuperar; 60.10 `#comunicar` comunicar y notificar; 60.11 `#postmortem` el
postmortem que cambia detecciones.

**Mapa `m60-incidente`.** La infraestructura de Tienda Norte con escenarios: credencial filtrada en el CI, un
contenedor con minería, un SSRF hacia la metadata, un ransomware en un servidor de archivos; cada paso con lo que
se ve, lo que se hace y lo que no se toca.

**Términos.** `orden-volatilidad`, `cadena-custodia`, `timeline-forense`, `contencion`, `tabletop`.

**Fuentes.** NIST SP 800-61 Rev. 3 (abril de 2025); RFC 3227; SANS; documentación de CloudTrail y del audit
log de Kubernetes.

### M61 — Seguridad de red y del correo

**Secciones.** 61.1 `#nsm` monitoreo de red: Zeek y Suricata (retoma M32.8); 61.2 `#dns` el DNS como señal;
61.3 `#tls-meta` lo que se ve sin descifrar (JA3/JA4, SNI); 61.4 `#correo` el phishing como entrada número uno;
61.5 `#spf` SPF; 61.6 `#dkim` DKIM; 61.7 `#dmarc` DMARC y su despliegue gradual; 61.8 `#mta-sts` MTA-STS y
BIMI; 61.9 `#tienda` el dominio de Tienda Norte.

**Widget `dmarc`.** Un mensaje con remitente, servidor de envío y firma; registros SPF, DKIM y DMARC editables;
evalúa la alineación y la política y dice qué hace el receptor.

**Términos.** `nsm`, `zeek`, `spf`, `dkim`, `dmarc`, `ja4`.

**Fuentes.** RFC 7208 (SPF), RFC 6376 (DKIM), RFC 7489 (DMARC), RFC 8461 (MTA-STS); requisitos de remitentes
masivos de Google y Yahoo (2024); documentación de Zeek y Suricata.

### CP-G — Checkpoint G: el blue team de una startup

Examen de 20 preguntas (cuatro por cada par de módulos) y un diseño: una startup de 40 personas con un SaaS en
Kubernetes pide su programa de seguridad para el primer año con un presupuesto fijo; el lector arma el threat
model, el pipeline, la gestión de vulnerabilidades, las diez primeras detecciones y el plan de respuesta.
Solución de referencia en `details.solution`.

## 4. Serie SEC: guías prácticas

Siguen las reglas de los tutoriales de AI Engineering (archivos completos, recorridos con `file-card`, hitos,
mapas de paso, anexos), adaptadas: no hay dos modelos, y "cómo comprobar" provoca la técnica contra el
laboratorio y comprueba que la detección dispare. Lista en `SD.data.projects.secTracks` (misma forma que
`mlTracks`), dibujada en `[data-sec-tracks]` con `series: 'sec'`. Datos en `data/projects/secNN.data.js`.

| Guía | Qué construye | Stack | Módulos |
|---|---|---|---|
| SEC00 | El laboratorio: Tienda Norte mínima + logs centralizados + SIEM | Docker Compose, Wazuh (o Loki + Grafana) | M59, M54 |
| SEC01 | Un pipeline DevSecOps que falla el build | GitHub Actions, Semgrep, gitleaks, Trivy, ZAP baseline | M55 |
| SEC02 | SBOM, firma y verificación antes de desplegar | Syft, Grype, cosign, provenance SLSA | M56 |
| SEC03 | Infraestructura como código revisada | Terraform, Checkov, Conftest y OPA | M37, M55 |
| SEC04 | Un clúster endurecido y vigilado | k3s, Pod Security Admission, Kyverno, NetworkPolicy, Falco | M57 |
| SEC05 | Detection-as-code | Sigma, pySigma, pruebas, Atomic Red Team solo contra el laboratorio | M59 |
| SEC06 | Un incidente de punta a punta | auditd, osquery, la línea de tiempo | M60 |
| SEC07 | Señuelos | honeytokens propios y su alerta | M59, M38 |
| SEC08 (extra) | Un agente de triaje de alertas | LangGraph; leer es libre, contener pasa por un `interrupt` | M59, M25 |

A19 "Del commit al clúster" (serie A, Java) queda como está; SEC01 y SEC02 la enlazan en "Cómo conectar".

## 5. Glosario

Categoría `seguridad` para todo. Ids revisados contra los 669 actuales el 2026-10-25: ninguno de los nuevos
existe. Reutilizar: `superficie-ataque`, `bola`, `ssrf`, `mass-assignment`, `sql-injection`, `waf`,
`owasp-crs`, `zero-trust`, `kubernetes`, `firma-digital`, `pki`, `ids-ips`, `threat-hunting`,
`incident-response`, `playbook-incidentes`, `honeytoken`, `audit-log`, `cis-benchmark`, `secrets-manager`,
`red-teaming`, `postmortem`, `runbook`.

## 6. Infraestructura

- `course.data.js`: parte `p7` con sus ítems `soon` desde el principio; cada módulo pasa a `ready` al publicarse.
- `tokens.css`: `--line-p7`.
- `home.js`: la Parte VII va en su propia fila del mapa de la ruta.
- `CLAUDE.md`: la Parte VII en "El proyecto", widgets en la tabla, ejercicios publicados y el árbol.

## 7. Checklist por módulo

`test-page.mjs` sin errores ni términos faltantes y sin desborde a 390 px; `links.mjs` del módulo y de los
módulos a los que enlaza; `quiz-bias.mjs` del quiz y del ejercicio; capturas en claro, en oscuro y a 390 px de
las figuras nuevas y del widget.
