<?php
return [
    'name'    => 'ECNET AI Email Agent',
    'version' => '2.0.0',
    'env'     => $_ENV['APP_ENV'] ?? 'production',
    'url'     => $_ENV['APP_URL'] ?? 'http://localhost',
    'secret'  => $_ENV['APP_SECRET'] ?? '',
];
