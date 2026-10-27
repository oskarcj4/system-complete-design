# Parte IX: Seguridad web, del navegador al servidor

Plan de la Parte IX (M73–M85 y el Checkpoint I) y de la serie de guías prácticas WEB00–WEB12, en PHP, sobre el proyecto del usuario `C:\xampp\htdocs\SistemaControlPracticas`. Pedido del usuario (2026-10-26): "Necesito ahora guias de Desarrollo Web, bueno de las vulnerabilidades y como mitigarlas, ejemplos en codigo de php, C:\xampp\htdocs\SistemaControlPracticas, habla de todo, CORS, CSRF, XSS, todo, como funcionan y como se mitigan, ademas dame mas ataques conocidos que toda web debe saber mitigar, habla del DOM, del Wasm (como corre PHP, o NextJS, componentes del cliente y del serivor), del WebAsembly. Primero genera el plan y las guias que vamos a tratar".

## Por qué una parte aparte

Lo web ya aparece en el curso, pero de pasada y desde el backend: M10 (`#xss-csrf-detalle`, `#sqli-detalle`, `#credenciales-detalle`) dedica una subsección a cada ataque, M55 (`#top10`, `#casos`) los ordena con el OWASP Top 10:2025 y los busca con herramientas (SAST, DAST), y M35 cubre la base de datos. Falta el lado del navegador: qué es un origen, por qué una cookie viaja sola, qué hace el DOM con un string, quién ejecuta qué código (PHP en el servidor, React en el servidor o en el cliente, Wasm en una caja) y cómo cada ataque aprovecha una de esas reglas. Esta parte no repite M10 ni M55: los enlaza y baja al mecanismo, con el código PHP de un proyecto real.

## Regla de seguridad de la parte

- **Todo se prueba contra tu propio laboratorio local** (`localhost` y los orígenes de prueba que arma WEB00). Ningún ejemplo apunta a un sitio de terceros.
- Los payloads son didácticos y mínimos (`alert(document.domain)`, un `console.log`, un formulario que hace un POST): muestran que el ataque funciona, no cómo esconderlo. No se enseña a evadir WAF, antivirus ni detección.
- Cada ataque termina en su mitigación, con la prueba que demuestra que quedó cerrado.
- Las afirmaciones sobre productos y CVE reales llevan `badge--doc` con fuente pública.

## El hilo común: el sistema de control de prácticas

Toda la parte usa el proyecto del usuario: una API en PHP 8 sin framework sobre MariaDB (XAMPP), con usuarios por rol (administrador, estudiante, reclutador), instituciones, carreras, oportunidades de práctica, postulaciones y su historial, solicitudes de publicación y una bitácora de auditoría. Los módulos lo citan como ejemplo; las guías lo arreglan paso a paso.

### Auditoría inicial (leída del repositorio el 2026-10-26, sin ejecutar)

Lo que ya está bien y se explica como acierto:

- `core/auth.php`: cookie firmada con HMAC-SHA256, firma comparada con `hash_equals` (tiempo constante), Base64 estricto, `exp` obligatorio.
- `core/csrf.php`: token CSRF derivado de la cookie con HMAC y exigido en la cabecera `X-CSRF-Token` para todo método que no sea GET, HEAD u OPTIONS (`core/auth-middleware.php`).
- Consultas con `prepare` y parámetros en los modelos; listas permitidas para `modalidad` y `estado`.
- `core/audit-log.php`: bitácora automática de INSERT, UPDATE y DELETE con las contraseñas redactadas.

Lo que hay que arreglar, con la guía que lo cierra:

| # | Hallazgo | Archivo | Clase | Guía |
|---|---|---|---|---|
| 1 | El `.env` con `COOKIE_KEY` y la contraseña de la base vive dentro de `htdocs` y no hay `.htaccess`: Apache lo sirve como texto | `api/core/.env` | Configuración, exposición de secretos | WEB01 |
| 2 | La carpeta `.git` está dentro de `htdocs`: se puede descargar el código y el historial | `.git/` | Exposición de código | WEB01 |
| 3 | PHP 8.0.30 sin soporte de seguridad desde noviembre de 2023 | XAMPP | Componente vulnerable | WEB00 |
| 4 | Los modelos llaman a `Response::debugError($e)`, que devuelve el mensaje de la excepción (SQL, rutas) al cliente; los errores salen con HTTP 200 | `models/*.php`, `core/response.php` | Fuga de información | WEB01 |
| 5 | `Response::json` no envía `Content-Type: application/json`: PHP responde `text/html` y un dato guardado con HTML se interpreta si alguien abre la URL de la API | `core/response.php` | XSS almacenado | WEB05 |
| 6 | El endpoint autoriza con el rol del propio usuario (`requireAuth($auth_data["id_rol"])`): cualquier autenticado pasa | `endpoints/oportunidades.php` y los demás | Control de acceso roto | WEB06 |
| 7 | `creado_por` y `actualizado_por` vienen del body: un usuario publica o cambia estados a nombre de otro | `endpoints/oportunidades.php`, `historial_estado_postulacion.php` | Mass assignment, IDOR | WEB06 |
| 8 | Los endpoints usan `requireCsrfToken()` y `requireAuth()` sin incluir `auth-middleware.php`, y piden CSRF también en GET: hoy fallan con error fatal | `endpoints/*.php` | Fallar cerrado contra fallar abierto | WEB00 |
| 9 | `models/login.php` no compila (`'roles' => ()` sin cerrar), compara `$result["password"]` cuando el alias es `contrasena`, filtra `estado = 1` sobre un ENUM, usa `asignaciones_roles` que `init.sql` no crea, y la cookie que emite no tiene el formato `b64|firma` que valida `checkAuth` | `models/login.php` | Autenticación | WEB00 (que arranque) y WEB02 (que sea segura) |
| 10 | La sesión no se puede revocar antes del `exp` (la tabla `sesiones_usuario` existe y no se usa), el login no tiene límite de intentos y el chequeo de IP compara por prefijo (`10.0.0.1` acepta a `10.0.0.12`) | `core/auth.php` | Sesión | WEB02 |
| 11 | Ninguna cabecera de seguridad (CSP, HSTS, `nosniff`, `frame-ancestors`, `Referrer-Policy`) y ninguna política CORS explícita | todo | Configuración | WEB04, WEB09 |
| 12 | `session_start()` en cada request con `cookie_secure=1` sobre HTTP: una sesión de PHP que no se usa y no viaja | `core/configuration.php` | Configuración | WEB02 |

La auditoría la confirma el lector en WEB00 con los comandos de la guía; las cifras y salidas no se inventan.

## Módulos

Cada módulo: objetivos, secciones numeradas, figuras primero (cada ataque con su diagrama de secuencia: víctima, navegador, sitio atacante, servidor), un widget cuando el mecanismo se entiende mejor jugando, quiz de 9 a 11, ejercicio guiado y checkpoint. Código de ejemplo en PHP (servidor) y JavaScript (navegador); M84 en TypeScript con Next.js.

| Módulo | Título | Contenido | Widget candidato | Estado |
|---|---|---|---|---|
| M73 | **El navegador por dentro** | Del HTML al DOM (tokenizer, árbol, parser que corrige), CSSOM, render, event loop y tareas; qué código corre dónde: PHP genera HTML en el servidor, JavaScript lo cambia en el cliente, Wasm corre en una caja; el ciclo de una request de formulario contra un `fetch`; DevTools como herramienta de seguridad | `domparse`: un string entra al parser y sale el árbol, con las correcciones que hace el navegador | Propuesto |
| M74 | **Origen, sitio y cookies** | Origen (esquema, host, puerto) contra sitio (eTLD+1, Public Suffix List); Same-Origin Policy: qué bloquea (leer) y qué no (enviar, incrustar); cookies a fondo: `Domain`, `Path`, `Secure`, `HttpOnly`, `SameSite` Strict, Lax y None, Lax por defecto, prefijos `__Host-` y `__Secure-`, cookies de terceros y particionadas (CHIPS); `setcookie` en PHP con sus opciones | `origins`: dos URL y el veredicto (mismo origen, mismo sitio, qué cookies viajan en cada tipo de request) | Propuesto |
| M75 | **CORS a fondo** | Por qué existe (relajar la SOP con permiso del servidor), request simple contra preflight (`OPTIONS`, `Access-Control-Request-Method`), credenciales y por qué `*` no las admite, `Vary: Origin`, errores reales (reflejar el `Origin`, aceptar `null`, regex sin ancla, subdominios comprometidos), CORS no protege contra CSRF, Private Network Access; la política en PHP | `cors`: origen, método, cabeceras y credenciales contra una política; muestra el preflight, la respuesta y si el JavaScript puede leerla | Propuesto |
| M76 | **CSRF** | El ataque (la cookie viaja sola), formularios, GET con efectos, login CSRF; defensas: SameSite (y sus huecos: Lax permite GET de nivel superior, mismo sitio no es mismo origen), token sincronizador, double submit firmado (el `csrf.php` del proyecto), comprobar `Origin` y Fetch Metadata (`Sec-Fetch-Site`), cabecera propia en `fetch`; por qué un JSON no basta | `csrf`: el sitio atacante dispara cinco tipos de request y se encienden defensas | Propuesto |
| M77 | **XSS y el DOM** | Reflejado, almacenado y basado en el DOM; contextos de salida (HTML, atributo, JavaScript, URL, CSS) y el escape de cada uno (`htmlspecialchars` con `ENT_QUOTES \| ENT_SUBSTITUTE` y `UTF-8`); fuentes y sumideros del DOM (`location.hash`, `innerHTML`, `document.write`, `eval`, `setAttribute('href')` con `javascript:`); `textContent` contra `innerHTML`; mutation XSS y por qué sanitizar con regex falla; DOMPurify y la Sanitizer API; Trusted Types; DOM clobbering; qué roba un XSS aunque la cookie sea `HttpOnly` | `xss`: un valor recorre los cinco contextos y se ve qué escape lo neutraliza y cuál no | Propuesto |
| M78 | **CSP y las cabeceras de seguridad** | Content Security Policy estricta (nonce, `strict-dynamic`, `object-src 'none'`, `base-uri`), por qué una lista de dominios no basta, `report-to` y modo report-only; HSTS y preload; `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; COOP, COEP y CORP (aislamiento entre orígenes, Spectre); dónde se ponen en Apache y en PHP | `csp`: una política y cinco inyecciones; cuáles ejecuta el navegador | Propuesto |
| M79 | **Inyecciones en el servidor** | SQL injection (retoma M10 `#sqli-detalle`): PDO, `ATTR_EMULATE_PREPARES`, identificadores (`ORDER BY`) con lista permitida, SQLi de segundo orden; command injection (`exec`, `escapeshellarg`); inclusión de archivos (LFI y RFI con `include $_GET`, `allow_url_include`, `phar://`); deserialización (`unserialize` contra `json_decode`); template injection (Twig, Blade); CRLF y header injection; XXE (`libxml`); NoSQL injection como contraste | Ninguno; diagramas de flujo de fuente a sumidero | Propuesto |
| M80 | **Control de acceso roto** | IDOR y BOLA, BFLA, mass assignment, autorizar en cada endpoint y en el servidor, path traversal, aislamiento entre usuarios; el caso de `creado_por` | `acl`: matriz de rol, acción y dueño del recurso | Propuesto |
| M81 | **Autenticación y sesiones** | `password_hash` con Argon2id, session fixation y regenerar, revocación, rate limiting del login, enumeración de usuarios, reset de contraseña, MFA y passkeys | Ninguno; diagramas de secuencia | Propuesto |
| M82 | **Archivos, SSRF y redirecciones** | Subidas seguras (fuera del webroot, tipo real, nombre propio), SSRF y la metadata de la nube, open redirect; las mitigaciones de cada uno | Ninguno | Propuesto |
| M83 | **Otros ataques que toda web debe cerrar** | Clickjacking, `postMessage`, prototype pollution, cache poisoning y cache deception, request smuggling, race conditions de negocio, ReDoS, scripts de terceros y SRI; cada uno con su mitigación | Ninguno | Propuesto |
| M84 | **Modelos de renderizado: PHP, SPA y Next.js** | Quién ejecuta qué: PHP clásico, SPA, SSR; Server Components contra Client Components, la frontera `'use client'`, Server Actions y su protección CSRF, secretos que llegan al bundle (`NEXT_PUBLIC_`), `server-only`; CVE de Next.js y React documentados | Ninguno | Propuesto |
| M85 | **WebAssembly** | Módulo, memoria lineal, imports y exports, WASI; cómo corre PHP en Wasm (php-wasm, WordPress Playground); Wasm en el servidor; qué protege el sandbox y qué no | `wasmmem`: la memoria lineal de un módulo | Propuesto |
| CP-I | **Checkpoint I** | Examen de la parte y auditar y endurecer una aplicación web completa | — | Propuesto |

## Guías prácticas: serie WEB (PHP, XAMPP, `SistemaControlPracticas`)

Aprobadas WEB00–WEB10. WEB11 (Next.js) y WEB12 (Wasm) quedan fuera por ahora. Mismas reglas que las guías A: archivos completos, Claude las escribe y no las ejecuta, nunca se inventan salidas ni cifras. El código parte del repositorio del usuario, que es la base oficial de la serie (como A00). Versión de PHP: 8.2, la de XAMPP actual. Cada guía provoca la falla en el laboratorio local, la arregla y la comprueba con una prueba.

| Guía | Título | Hallazgos que cierra |
|---|---|---|
| WEB00 | El laboratorio | 3, 8, 9 (que arranque); un frontend mínimo y un segundo origen local para las pruebas entre orígenes |
| WEB01 | Lo que no debe verse | 1, 2, 4 |
| WEB02 | Sesión y login seguros | 9, 10, 12 |
| WEB03 | CSRF | Comprobación del token, SameSite, `Origin` |
| WEB04 | CORS | 11 (política CORS) |
| WEB05 | XSS en el feed de oportunidades | 5; escape en el frontend, CSP |
| WEB06 | Control de acceso | 6, 7 |
| WEB07 | Inyecciones | PDO sin emulación, identificadores con lista permitida, la bitácora |
| WEB08 | Subir el CV y SSRF | Subida segura; vista previa de `sitio_web` sin SSRF |
| WEB09 | Cabeceras | 11 (cabeceras de seguridad) |
| WEB10 | Carreras y lógica de negocio | Postulaciones duplicadas: `UNIQUE`, transacción, `FOR UPDATE` |

## Decisiones tomadas (2026-10-26)

- Parte IX nueva, `p9` en `course.data.js`, cuenta para el progreso.
- El repositorio del usuario es la base oficial de las guías WEB.
- PHP 8.2 en las guías.
- Primero la teoría, en lotes de tres: M73–M75, M76–M78, M79–M81, M82–M84, M85 y CP-I. Después las guías WEB00–WEB10.

## Fuentes por verificar

MDN (Same-Origin Policy, CORS, cookies, CSP, Trusted Types, Fetch Metadata), la especificación Fetch de WHATWG, RFC 6265bis (cookies), la Public Suffix List, las hojas de OWASP (CSRF, XSS, autorización), el manual de PHP (`setcookie`, `htmlspecialchars`, `password_hash`, PDO), la documentación de Next.js (Server Actions, `server-only`) y los avisos de seguridad de Next.js y React, WebAssembly.org y la documentación de php-wasm y WordPress Playground.
