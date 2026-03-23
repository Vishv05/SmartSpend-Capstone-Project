"""
Smart Category Prediction Service
Uses Machine Learning to suggest expense categories based on description text.
"""
import pickle
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from django.conf import settings
from .models import Expense, Category


class CategoryPredictor:
    """ML-based expense category predictor"""
    
    MODEL_PATH = os.path.join(settings.BASE_DIR, 'api', 'category_model.pkl')
    MIN_TRAINING_SAMPLES = 10
    
    def __init__(self):
        self.model = None
        self.categories_map = {}  # Maps category_id to Category object
        self.is_trained = False
        
    def train(self, force_retrain=False):
        """
        Train the model on existing expense data.
        Returns True if training succeeded, False otherwise.
        """
        # Try loading existing model first
        if not force_retrain and self._load_model():
            return True
            
        # Fetch training data from approved expenses
        expenses = Expense.objects.filter(
            status='approved',
            category__isnull=False
        ).exclude(description='').values('description', 'category_id', 'category__name')
        
        if expenses.count() < self.MIN_TRAINING_SAMPLES:
            print(f"Not enough training data: {expenses.count()} samples (need {self.MIN_TRAINING_SAMPLES})")
            return False
        
        # Prepare training data
        descriptions = [e['description'].lower() for e in expenses]
        category_ids = [e['category_id'] for e in expenses]
        
        # Build categories map
        categories = Category.objects.all()
        self.categories_map = {cat.id: cat for cat in categories}
        
        # Create and train pipeline
        self.model = Pipeline([
            ('tfidf', TfidfVectorizer(
                max_features=500,
                ngram_range=(1, 2),
                min_df=1,
                stop_words='english'
            )),
            ('classifier', MultinomialNB(alpha=0.1))
        ])
        
        try:
            self.model.fit(descriptions, category_ids)
            self.is_trained = True
            self._save_model()
            print(f"Model trained successfully on {len(descriptions)} samples")
            return True
        except Exception as e:
            print(f"Error training model: {e}")
            return False
    
    def predict(self, description, top_n=3):
        """
        Predict category for a given expense description.
        Returns list of tuples: [(category_id, category_name, confidence), ...]
        """
        if not self.is_trained:
            if not self.train():
                return []
        
        if not description or not description.strip():
            return []
        
        try:
            # Get probabilities for all categories
            description_clean = description.lower()
            probabilities = self.model.predict_proba([description_clean])[0]
            category_ids = self.model.classes_
            
            # Sort by confidence (descending)
            predictions = list(zip(category_ids, probabilities))
            predictions.sort(key=lambda x: x[1], reverse=True)
            
            # Return top N predictions
            results = []
            for cat_id, confidence in predictions[:top_n]:
                if cat_id in self.categories_map:
                    category = self.categories_map[cat_id]
                    results.append({
                        'category_id': cat_id,
                        'category_name': category.name,
                        'confidence': round(float(confidence) * 100, 2)
                    })
            
            return results
        except Exception as e:
            print(f"Error predicting category: {e}")
            return []
    
    def _save_model(self):
        """Save trained model to disk"""
        try:
            with open(self.MODEL_PATH, 'wb') as f:
                pickle.dump({
                    'model': self.model,
                    'categories_map': self.categories_map,
                    'is_trained': self.is_trained
                }, f)
            print(f"Model saved to {self.MODEL_PATH}")
        except Exception as e:
            print(f"Error saving model: {e}")
    
    def _load_model(self):
        """Load trained model from disk"""
        if not os.path.exists(self.MODEL_PATH):
            return False
        
        try:
            with open(self.MODEL_PATH, 'rb') as f:
                data = pickle.load(f)
                self.model = data['model']
                self.categories_map = data['categories_map']
                self.is_trained = data['is_trained']
            print("Model loaded from disk")
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False


# Global predictor instance
_predictor = None

def get_predictor():
    """Get or create the global predictor instance"""
    global _predictor
    if _predictor is None:
        _predictor = CategoryPredictor()
    return _predictor
