from django.conf import settings
from django.db.models import F, Min
from django.utils import timezone

from .models import Card, Touch


class GameOnMixin:
    """Show the placeholder page instead of the table before settings.GAME_START."""

    placeholder_template_name = 'table/placeholder.html'

    def get_template_names(self):
        if timezone.localdate() < settings.GAME_START:
            return [self.placeholder_template_name]
        return super().get_template_names()


class TableDataContextMixin:
    """Add to the context the data the table animation needs, as table_data."""

    def get_table_data(self):
        return {
            'cards': list(Card.objects.values('seat', 'snak', 'gejst', 'undren', 'minder')),
            'touches': list(Touch.objects.values(seat=F('card__seat'), at=F('touched_at')))
        }

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['table_cards'] = Card.objects.annotate(first_touched_at=Min('touches__touched_at'))
        context['table_data'] = self.get_table_data()
        return context