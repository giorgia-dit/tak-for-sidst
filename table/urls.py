from django.urls import path

from .views import *

app_name = 'table'

urlpatterns = [
    path('', CardListView.as_view(), name='card_list'),
    path('cards/<int:seat>/', CardDetailView.as_view(), name='card_detail'),
    path('<str:token>/', CardTouchView.as_view(), name='card_touch'),
]