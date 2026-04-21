<?php
$code  = $_GET['code'] ?? '';
$state = $_GET['state'] ?? '';

if (!$code || !$state) {
    http_response_code(400);
    echo '<h2>Error</h2><p>Missing code or state.</p>';
    exit;
}

$stateData = json_decode(base64_decode($state), true);
$orgId     = $stateData['orgId'] ?? '';
if (!$orgId) {
    http_response_code(400);
    echo '<h2>Error</h2><p>Invalid state.</p>';
    exit;
}

$cfg = Database::query('SELECT * FROM azure_configs WHERE organization_id = ?', [$orgId])->fetch();
if (!$cfg) {
    http_response_code(400);
    echo '<h2>Error</h2><p>Azure configuration not found.</p>';
    exit;
}

$client = new OutlookClient($cfg);
$tokens = $client->exchangeCode($code);

if (isset($tokens['error'])) {
    http_response_code(500);
    echo '<h2>Authentication Failed</h2><p>Could not exchange code: ' . htmlspecialchars($tokens['error_description'] ?? $tokens['error']) . '</p>';
    exit;
}

$accessToken = $tokens['access_token'];
$refreshToken = $tokens['refresh_token'] ?? null;
$expiresIn = $tokens['expires_in'] ?? 3600;

// Get user info to find out email address
$userInfo = $client->getUserInfo($accessToken);
$email = $userInfo['mail'] ?? $userInfo['userPrincipalName'] ?? null;
if (!$email) {
    http_response_code(500);
    echo '<h2>Error</h2><p>Could not retrieve email address from Graph API.</p>';
    exit;
}

// Store in DB
Database::query('
    INSERT INTO outlook_accounts (id, organization_id, email, access_token, refresh_token, expires_at)
    VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))
    ON DUPLICATE KEY UPDATE 
        access_token=VALUES(access_token),
        refresh_token=COALESCE(VALUES(refresh_token), refresh_token),
        expires_at=VALUES(expires_at)
', [
    Database::uuid(), $orgId, $email, 
    Encryption::encrypt($accessToken), 
    $refreshToken ? Encryption::encrypt($refreshToken) : null,
    $expiresIn
]);

// Return success page that posts message to opener and closes
header('Content-Type: text/html');
echo <<<HTML
<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;">
<div style="text-align:center;background:white;padding:2rem;border-radius:1rem;box-shadow:0 10px 15px -3px rgba(0,0,0,.1);">
  <h2 style="color:#0ea5e9;">Authentication Successful</h2>
  <p>Outlook account <strong>{$email}</strong> has been connected.</p>
  <script>
    if(window.opener){window.opener.postMessage({type:'OUTLOOK_AUTH_SUCCESS',email:'{$email}'},'*');setTimeout(()=>window.close(),1500);}
    else{setTimeout(()=>{window.location.href='/';},2000);}
  </script>
</div></body></html>
HTML;
exit;
