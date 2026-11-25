from django.conf import settings

READABLE_SETTINGS = ['DEBUG', 'GAME_START', 'GAME_END']


def settings_context(_request):
    return {'settings': {name: getattr(settings, name) for name in READABLE_SETTINGS}}