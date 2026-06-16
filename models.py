import sqlite3
import os

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'database.db')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'schema.sql')

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(force=False):
    """Initializes the database if it doesn't exist, or if force=True."""
    if force or not os.path.exists(DATABASE_PATH):
        print("Initializing database...")
        conn = get_db_connection()
        with open(SCHEMA_PATH, 'r') as f:
            conn.executescript(f.read())
        conn.commit()
        conn.close()
        print("Database initialized successfully!")

# Recipe Functions
def get_recipes(search_query=None, category=None):
    conn = get_db_connection()
    query = "SELECT * FROM recipes WHERE 1=1"
    params = []
    
    if search_query:
        query += " AND (title LIKE ? OR description LIKE ?)"
        params.extend([f"%{search_query}%", f"%{search_query}%"])
        
    if category and category != 'All':
        query += " AND category = ?"
        params.append(category)
        
    query += " ORDER BY title ASC"
    
    cursor = conn.cursor()
    cursor.execute(query, params)
    recipes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return recipes

def get_recipe(recipe_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get recipe basic info
    cursor.execute("SELECT * FROM recipes WHERE id = ?", (recipe_id,))
    recipe_row = cursor.fetchone()
    if not recipe_row:
        conn.close()
        return None
        
    recipe = dict(recipe_row)
    
    # Get ingredients
    cursor.execute("SELECT name, quantity, unit, category FROM ingredients WHERE recipe_id = ?", (recipe_id,))
    recipe['ingredients'] = [dict(row) for row in cursor.fetchall()]
    
    # Get instructions
    cursor.execute("SELECT step_number, instruction FROM instructions WHERE recipe_id = ? ORDER BY step_number ASC", (recipe_id,))
    recipe['instructions'] = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return recipe

def create_recipe(title, description, servings, prep_time, cook_time, category, image_url, ingredients_list, instructions_list):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "INSERT INTO recipes (title, description, servings, prep_time, cook_time, category, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (title, description, int(servings), int(prep_time), int(cook_time), category, image_url)
        )
        recipe_id = cursor.lastrowid
        
        # Insert ingredients
        for ing in ingredients_list:
            cursor.execute(
                "INSERT INTO ingredients (recipe_id, name, quantity, unit, category) VALUES (?, ?, ?, ?, ?)",
                (recipe_id, ing['name'], float(ing['quantity']), ing.get('unit', ''), ing.get('category', 'Pantry'))
            )
            
        # Insert instructions
        for idx, inst in enumerate(instructions_list):
            cursor.execute(
                "INSERT INTO instructions (recipe_id, step_number, instruction) VALUES (?, ?, ?)",
                (recipe_id, idx + 1, inst['instruction'])
            )
            
        conn.commit()
        return recipe_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def delete_recipe(recipe_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM recipes WHERE id = ?", (recipe_id,))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# Meal Plan Functions
def get_meal_plan():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT mp.id, mp.day_of_week, mp.meal_type, mp.recipe_id, r.title as recipe_title, r.image_url as recipe_image
        FROM meal_plan mp
        JOIN recipes r ON mp.recipe_id = r.id
    """)
    plan = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return plan

def update_meal_plan(day_of_week, meal_type, recipe_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if already exists for this slot
        cursor.execute(
            "SELECT id FROM meal_plan WHERE day_of_week = ? AND meal_type = ?",
            (day_of_week, meal_type)
        )
        row = cursor.fetchone()
        
        if recipe_id is None or recipe_id == '':
            # Delete if exists and recipe_id is empty
            if row:
                cursor.execute("DELETE FROM meal_plan WHERE id = ?", (row['id'],))
        else:
            if row:
                # Update
                cursor.execute(
                    "UPDATE meal_plan SET recipe_id = ? WHERE id = ?",
                    (int(recipe_id), row['id'])
                )
            else:
                # Insert
                cursor.execute(
                    "INSERT INTO meal_plan (day_of_week, meal_type, recipe_id) VALUES (?, ?, ?)",
                    (day_of_week, meal_type, int(recipe_id))
                )
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def clear_meal_plan():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM meal_plan")
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# Grocery List Aggregation
def generate_grocery_list():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Select all ingredients for recipes currently in the meal plan
    # We also fetch the recipe default servings so we can correctly scale if needed.
    # Currently, we scale to the base recipe serving size.
    # We will fetch ingredients and combine them.
    cursor.execute("""
        SELECT i.name, i.quantity, i.unit, i.category
        FROM meal_plan mp
        JOIN ingredients i ON mp.recipe_id = i.recipe_id
    """)
    rows = cursor.fetchall()
    conn.close()
    
    # Consolidate ingredients
    consolidated = {}
    
    for row in rows:
        name = row['name'].strip().title()
        quantity = row['quantity']
        unit = row['unit'].strip().lower() if row['unit'] else ''
        category = row['category'].strip().title() if row['category'] else 'Pantry'
        
        key = (name, unit)
        if key in consolidated:
            consolidated[key]['quantity'] += quantity
        else:
            consolidated[key] = {
                'name': name,
                'quantity': quantity,
                'unit': unit,
                'category': category,
                'checked': False
            }
            
    # Group by category
    grouped = {}
    for key, item in consolidated.items():
        cat = item['category']
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append({
            'name': item['name'],
            'quantity': round(item['quantity'], 2),
            'unit': item['unit'],
            'checked': item['checked']
        })
        
    return grouped
