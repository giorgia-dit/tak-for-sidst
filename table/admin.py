from django.contrib import admin

from .models import Card, Touch


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ['seat', 'name', 'surname', 'color', 'snak', 'gejst', 'undren', 'minder', 'last_seen_at']
    list_filter = ['color']
    search_fields = ['name', 'surname']
    readonly_fields = ['token', 'last_seen_at']


@admin.register(Touch)
class TouchAdmin(admin.ModelAdmin):
    list_display = ['card', 'day', 'touched_at']
    list_filter = ['day']
    search_fields = ['card__name', 'card__surname']
    readonly_fields = ['day']