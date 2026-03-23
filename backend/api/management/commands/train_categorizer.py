"""
Management command to train the category prediction model
Usage: python manage.py train_categorizer
"""
from django.core.management.base import BaseCommand
from api.ml_categorizer import get_predictor


class Command(BaseCommand):
    help = 'Train the ML category prediction model on existing expense data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force retrain even if model exists',
        )

    def handle(self, *args, **options):
        force_retrain = options.get('force', False)
        
        self.stdout.write('Training category prediction model...')
        
        predictor = get_predictor()
        success = predictor.train(force_retrain=force_retrain)
        
        if success:
            self.stdout.write(self.style.SUCCESS('Model trained successfully.'))
            self.stdout.write(f'  - Trained: {predictor.is_trained}')
            self.stdout.write(f'  - Categories: {len(predictor.categories_map)}')
        else:
            self.stdout.write(self.style.ERROR('Training failed'))
            self.stdout.write('  - Check if you have enough approved expenses (need at least 10)')
