from django.db.models import Min
from django.utils import timezone
from django.views.generic import ListView, DetailView

from .models import Card, Touch

__all__ = [
    'CardListView',
    'CardDetailView'
]


class CardListView(ListView):
    queryset = Card.objects.annotate(first_touched_at=Min('touches__touched_at'))
    template_name = 'table/cards.html'


class CardDetailView(DetailView):
    model = Card
    slug_field = 'token'
    slug_url_kwarg = 'token'
    template_name = 'table/card.html'

    def get(self, request, *args, **kwargs):
        response = super().get(request, *args, **kwargs)
        # super().get() builds the context - so previous_seen_at is already saved
        self.object.touch()
        self.object.update_last_seen()
        return response

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['previous_seen_at'] = self.object.last_seen_at
        return context
    