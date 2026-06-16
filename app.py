from flask import Flask, render_template, jsonify, request, send_from_directory
import os
import models

app = Flask(__name__)

# Initialize database
models.init_db()

@app.route('/')
def index():
    return render_template('index.html')

# API Routes

@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    search = request.args.get('search', '')
    category = request.args.get('category', 'All')
    recipes = models.get_recipes(search, category)
    return jsonify(recipes)

@app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    recipe = models.get_recipe(recipe_id)
    if recipe is None:
        return jsonify({'error': 'Recipe not found'}), 404
    return jsonify(recipe)

@app.route('/api/recipes', methods=['POST'])
def create_recipe():
    data = request.json
    if not data:
        return jsonify({'error': 'Invalid request data'}), 400
        
    title = data.get('title')
    description = data.get('description', '')
    servings = data.get('servings', 4)
    prep_time = data.get('prep_time', 0)
    cook_time = data.get('cook_time', 0)
    category = data.get('category', 'Dinner')
    image_url = data.get('image_url', '/static/images/default_recipe.png')
    
    ingredients = data.get('ingredients', [])
    instructions = data.get('instructions', [])
    
    if not title or not ingredients or not instructions:
        return jsonify({'error': 'Title, ingredients, and instructions are required'}), 400
        
    try:
        recipe_id = models.create_recipe(
            title, description, servings, prep_time, cook_time, category, image_url, ingredients, instructions
        )
        return jsonify({'success': True, 'id': recipe_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recipes/<int:recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    try:
        recipe = models.get_recipe(recipe_id)
        if not recipe:
            return jsonify({'error': 'Recipe not found'}), 404
            
        models.delete_recipe(recipe_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/meal-plan', methods=['GET'])
def get_meal_plan():
    plan = models.get_meal_plan()
    return jsonify(plan)

@app.route('/api/meal-plan', methods=['POST'])
def update_meal_plan():
    data = request.json
    if not data:
        return jsonify({'error': 'Invalid request data'}), 400
        
    day_of_week = data.get('day_of_week')
    meal_type = data.get('meal_type')
    recipe_id = data.get('recipe_id') # Can be None/empty to delete
    
    if not day_of_week or not meal_type:
        return jsonify({'error': 'Day of week and meal type are required'}), 400
        
    try:
        # Convert to None if empty string
        r_id = None if recipe_id == '' or recipe_id is None else int(recipe_id)
        models.update_meal_plan(day_of_week, meal_type, r_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/meal-plan/clear', methods=['POST'])
def clear_meal_plan():
    try:
        models.clear_meal_plan()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/grocery-list', methods=['GET'])
def get_grocery_list():
    grocery_list = models.generate_grocery_list()
    return jsonify(grocery_list)

if __name__ == '__main__':
    # Initialize db just in case
    models.init_db()
    # Run the server
    app.run(debug=True, port=5000)
