<?php
declare(strict_types=1);
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Organization-Id');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// Load .env
if (file_exists(dirname(__DIR__) . '/.env')) {
    foreach (file(dirname(__DIR__) . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($val, " \t\n\r\0\x0B\"'");
    }
}

// Autoload lib classes
spl_autoload_register(function (string $class): void {
    $file = dirname(__DIR__) . '/lib/' . $class . '.php';
    if (file_exists($file)) require_once $file;
});

// Parse path
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri    = preg_replace('#^/api#', '', $uri);
$method = $_SERVER['REQUEST_METHOD'];

// Route table
$routes = [
    'POST /auth/login'                    => 'auth/login.php',
    'POST /auth/logout'                   => 'auth/logout.php',
    'GET /auth/me'                        => 'auth/me.php',
    'POST /gmail/connect'                 => 'gmail/connect.php',
    'GET /gmail/callback'                 => 'gmail/callback.php',
    'POST /gmail/sync'                    => 'gmail/sync.php',
    'POST /gmail/send'                    => 'gmail/send.php',
    'POST /ai/classify'                   => 'ai/classify.php',
    'POST /ai/draft'                      => 'ai/draft.php',
    'GET /messages'                       => 'messages/index.php',
    'PUT /drafts/{id}'                    => 'drafts/update.php',
    'DELETE /drafts/{id}'                 => 'drafts/delete.php',
    'GET /admin/users'                    => 'admin/users/index.php',
    'POST /admin/users'                   => 'admin/users/create.php',
    'PUT /admin/users/{id}'               => 'admin/users/update.php',
    'DELETE /admin/users/{id}'            => 'admin/users/delete.php',
    'GET /admin/organizations'            => 'admin/organizations/index.php',
    'POST /admin/organizations'           => 'admin/organizations/create.php',
    'DELETE /admin/organizations/{id}'    => 'admin/organizations/delete.php',
    'GET /admin/gcp/{orgId}'              => 'admin/gcp/get.php',
    'POST /admin/gcp'                     => 'admin/gcp/save.php',
    'DELETE /admin/gcp/{orgId}'           => 'admin/gcp/delete.php',
];

foreach ($routes as $route => $file) {
    [$routeMethod, $routePath] = explode(' ', $route, 2);
    if ($routeMethod !== $method) continue;
    $pattern = preg_replace('/\{[^}]+\}/', '([^/]+)', $routePath);
    if (preg_match("#^{$pattern}$#", $uri, $matches)) {
        array_shift($matches);
        // Extract named params from route
        preg_match_all('/\{([^}]+)\}/', $routePath, $params);
        foreach ($params[1] as $i => $paramName) {
            $_GET[$paramName] = $matches[$i] ?? '';
        }
        require __DIR__ . '/' . $file;
        exit;
    }
}

Response::error('Not found', 404);
