from django.views.generic import DetailView, ListView

from .models import Card
from .viewmixins import TableDataContextMixin

__all__ = [
    'CardDetailView',
    'CardListView'
]


class CardListView(TableDataContextMixin, ListView):
    model = Card
    template_name = 'table/cards.html'


class CardDetailView(TableDataContextMixin, DetailView):
    model = Card
    slug_field = 'token'
    slug_url_kwarg = 'token'
    template_name = 'table/card.html'

    def get_table_data(self):
        data = super().get_table_data()
        data['card_seat'] = self.object.seat
        data['card_previous_seen_at'] = self.object.last_seen_at
        return data

    def get(self, request, *args, **kwargs):
        self.object = self.get_object()
        self.object.touch()
        context = self.get_context_data(object=self.object)

        self.object.update_last_seen()
        return self.render_to_response(context)
    