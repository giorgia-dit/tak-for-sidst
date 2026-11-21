from django.views.generic import DetailView, ListView

from .models import Card, Touch
from .viewmixins import TableDataContextMixin

__all__ = [
    'CardDetailView',
    'CardListView',
    'CardTouchView',
]


class CardListView(TableDataContextMixin, ListView):
    model = Card
    template_name = 'table/cards.html'


class CardDetailView(DetailView):
    model = Card
    slug_field = 'seat'
    slug_url_kwarg = 'seat'
    template_name = 'modals/card.html'


class CardTouchView(TableDataContextMixin, DetailView):
    model = Card
    slug_field = 'token'
    slug_url_kwarg = 'token'
    template_name = 'table/card.html'

    def get_table_data(self):
        data = super().get_table_data()
        data['card_seat'] = self.object.seat
        data['card_previous_seen_at'] = self.object.last_seen_at
        return data

    def get_context_data(self, **kwargs): # TODO review
        context = super().get_context_data(**kwargs)
        previous_seen_at = context['table_data']['card_previous_seen_at']
        context['show_intro'] = (
            previous_seen_at is None
            or Touch.objects.filter(touched_at__gt=previous_seen_at).exists()
        )
        return context

    def get(self, request, *args, **kwargs):
        self.object = self.get_object()
        self.object.touch()
        context = self.get_context_data(object=self.object)

        self.object.update_last_seen()
        return self.render_to_response(context)
    