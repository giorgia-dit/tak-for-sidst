import secrets


def generate_token():
    # 8 characters, without 0/o and 1/l/i, so a URL can be read and typed by hand.
    alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
    return ''.join(secrets.choice(alphabet) for _ in range(8))
