from django.urls import path

from .views import *

app_name = 'table'

urlpatterns = [
    path('', CardListView.as_view(), name='card_list'),
    path('<str:token>/', CardDetailView.as_view(), name='card_detail'),
]