from django.urls import path
from . import views

urlpatterns = [
    path('', views.init_view, name='init'),
    path('home/', views.home_view, name='home'),
    path('specs/', views.specs_view, name='specs'),
    path('make_ladder/', views.make_ladder_view, name='make_ladder'),
    path('ladder_display/', views.ladder_display_view, name='ladder_display'),
    path('save_load/', views.save_load_view, name='save_load'),
    path('import_data', views.import_data_view, name='import_data'),
    path('import_csv', views.import_csv_view, name='import_csv'),
    path('sample_csv', views.sample_csv_view, name='sample_csv'),
    path('clear_data', views.clear_data_view, name='clear_data'),
]
