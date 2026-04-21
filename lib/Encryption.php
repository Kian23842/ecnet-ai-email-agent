<?php
declare(strict_types=1);

class Encryption {
    private static string $cipher = 'AES-256-CBC';

    public static function encrypt(string $plaintext): string {
        $key = hex2bin($_ENV['ENCRYPTION_KEY']);
        $iv  = random_bytes(openssl_cipher_iv_length(self::$cipher));
        $encrypted = openssl_encrypt($plaintext, self::$cipher, $key, OPENSSL_RAW_DATA, $iv);
        return base64_encode($iv . $encrypted);
    }

    public static function decrypt(string $ciphertext): string {
        $key  = hex2bin($_ENV['ENCRYPTION_KEY']);
        $data = base64_decode($ciphertext);
        $ivLen = openssl_cipher_iv_length(self::$cipher);
        $iv = substr($data, 0, $ivLen);
        $encrypted = substr($data, $ivLen);
        return openssl_decrypt($encrypted, self::$cipher, $key, OPENSSL_RAW_DATA, $iv);
    }
}
