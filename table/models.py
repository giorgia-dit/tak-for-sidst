from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.db.models.lookups import Exact
from django.utils import timezone
from django.utils.text import slugify

from .utils import generate_token


class Card(models.Model):
    class Color(models.TextChoices):
        RED = 'red', 'Rosso'
        GREEN = 'green', 'Verde'

    token = models.CharField(max_length=16, unique=True, default=generate_token, editable=False)
    color = models.CharField(max_length=5, choices=Color.choices)
    seat = models.PositiveSmallIntegerField(unique=True)
    name = models.CharField(max_length=50)
    surname = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    snak = models.PositiveSmallIntegerField()
    gejst = models.PositiveSmallIntegerField()
    undren = models.PositiveSmallIntegerField()
    minder = models.PositiveSmallIntegerField()
    last_seen_at = models.DateTimeField(null=True, blank=True, editable=False)

    class Meta:
        ordering = ['seat']
        constraints = [
            models.CheckConstraint(
                condition=Q(seat__range=(1, 30)),
                name='card_seat_range',
            ),
            models.CheckConstraint(
                condition=Q(snak__range=(1, 5), gejst__range=(1, 5), undren__range=(1, 5), minder__range=(1, 5)),
                name='card_scores_range',
            ),
            models.CheckConstraint(
                condition=Exact(F('snak') + F('gejst') + F('undren') + F('minder'), 12),
                name='card_scores_total',
            ),
        ]

    def __str__(self):
        return f'{self.seat:02d} · {self.name.lower()}'

    @property
    def slug(self):
        return slugify(f'{self.name}{self.surname}').replace('-', '')

    @property
    def svg_path(self):
        return f'img/svg/{self.slug}.svg'

    def touch(self):
        """
        Record today's touch for this card.

        Only one touch per day counts: if the card was already touched today
        (in the local time zone), the existing touch is kept unchanged.
        Nothing is recorded from settings.GAME_END onwards.
        """
        today = timezone.localdate()
        if today >= settings.GAME_END:
            return
        self.touches.get_or_create(day=today)

    def update_last_seen(self):
        """
        Store the current moment as the last time this card's table was seen.
        """
        self.last_seen_at = timezone.now()
        self.save(update_fields=['last_seen_at'])


class Touch(models.Model):
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='touches')
    touched_at = models.DateTimeField(default=timezone.now)
    day = models.DateField(editable=False)

    class Meta:
        ordering = ['touched_at']
        constraints = [
            models.UniqueConstraint(
                fields=['card', 'day'],
                name='touch_card_day',
            ),
        ]

    def __str__(self):
        return f'{self.card} · {self.day}'

    def save(self, *args, **kwargs):
        if not self.day:
            self.day = timezone.localdate(self.touched_at)
        super().save(*args, **kwargs)