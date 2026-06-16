-- SQL Database Schema for Recipe Book & Meal Planner

DROP TABLE IF EXISTS meal_plan;
DROP TABLE IF EXISTS instructions;
DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS recipes;

-- Recipes Table
CREATE TABLE recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    servings INTEGER NOT NULL DEFAULT 4,
    prep_time INTEGER NOT NULL, -- in minutes
    cook_time INTEGER NOT NULL, -- in minutes
    category TEXT NOT NULL,      -- Breakfast, Lunch, Dinner, Dessert, Snack
    image_url TEXT
);

-- Ingredients Table
CREATE TABLE ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT,
    category TEXT NOT NULL, -- Produce, Meat, Dairy, Pantry, Spices (for grocery grouping)
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Instructions Table
CREATE TABLE instructions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Meal Plan Table
CREATE TABLE meal_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_of_week TEXT NOT NULL, -- Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
    meal_type TEXT NOT NULL,   -- Breakfast, Lunch, Dinner
    recipe_id INTEGER NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Seed Data: Recipes
INSERT INTO recipes (id, title, description, servings, prep_time, cook_time, category, image_url) VALUES 
(1, 'Avocado Sourdough Toast', 'Crispy toasted sourdough bread topped with creamy mashed avocado, a perfectly fried egg, cherry tomatoes, and a sprinkle of chili flakes.', 2, 10, 5, 'Breakfast', '/static/images/avocado_toast.png'),
(2, 'Creamy Tuscan Garlic Chicken', 'Tender chicken breasts seared to perfection and simmered in a luxurious, creamy parmesan sauce loaded with fresh spinach and sweet sun-dried tomatoes.', 4, 15, 25, 'Dinner', '/static/images/tuscan_chicken.png'),
(3, 'Mediterranean Quinoa Salad', 'A light, refreshing salad featuring fluffy quinoa, crisp cucumbers, sweet cherry tomatoes, salty Kalamata olives, and crumbled feta cheese, all tossed in a tangy lemon vinaigrette.', 4, 15, 15, 'Lunch', '/static/images/quinoa_salad.png');

-- Seed Data: Ingredients for Avocado Sourdough Toast (recipe_id = 1)
INSERT INTO ingredients (recipe_id, name, quantity, unit, category) VALUES 
(1, 'Sourdough Bread', 2, 'slices', 'Pantry'),
(1, 'Ripe Avocado', 1, 'piece', 'Produce'),
(1, 'Large Eggs', 2, 'pieces', 'Dairy'),
(1, 'Cherry Tomatoes', 0.25, 'cup', 'Produce'),
(1, 'Olive Oil', 1, 'tbsp', 'Pantry'),
(1, 'Chili Flakes', 0.5, 'tsp', 'Spices'),
(1, 'Salt & Pepper', 1, 'pinch', 'Spices');

-- Seed Data: Instructions for Avocado Sourdough Toast (recipe_id = 1)
INSERT INTO instructions (recipe_id, step_number, instruction) VALUES 
(1, 1, 'Toast the sourdough bread slices until golden brown and crispy.'),
(1, 2, 'Mash the avocado in a small bowl with a pinch of salt, pepper, and a squeeze of fresh lemon juice.'),
(1, 3, 'Heat olive oil in a non-stick skillet over medium-high heat and fry the eggs to your preference (sunny-side up is highly recommended!).'),
(1, 4, 'Spread the mashed avocado evenly across both slices of toast, then top with halved cherry tomatoes and the fried eggs.'),
(1, 5, 'Garnish with chili flakes and a crack of fresh black pepper.');

-- Seed Data: Ingredients for Creamy Tuscan Garlic Chicken (recipe_id = 2)
INSERT INTO ingredients (recipe_id, name, quantity, unit, category) VALUES 
(2, 'Boneless Chicken Breasts', 4, 'pieces', 'Meat'),
(2, 'Olive Oil', 2, 'tbsp', 'Pantry'),
(2, 'Heavy Cream', 1, 'cup', 'Dairy'),
(2, 'Chicken Broth', 0.5, 'cup', 'Pantry'),
(2, 'Garlic Powder', 1, 'tsp', 'Spices'),
(2, 'Fresh Spinach', 1, 'cup', 'Produce'),
(2, 'Sun-dried Tomatoes', 0.5, 'cup', 'Pantry'),
(2, 'Grated Parmesan Cheese', 0.5, 'cup', 'Dairy');

-- Seed Data: Instructions for Creamy Tuscan Garlic Chicken (recipe_id = 2)
INSERT INTO instructions (recipe_id, step_number, instruction) VALUES 
(2, 1, 'Season the chicken breasts evenly with garlic powder, salt, and pepper on both sides.'),
(2, 2, 'Heat olive oil in a large skillet over medium-high heat. Sear the chicken for about 5 minutes on each side, or until golden brown. Remove from skillet and set aside.'),
(2, 3, 'In the same skillet, pour in chicken broth, heavy cream, garlic powder, and grated parmesan. Stir well and bring to a gentle simmer.'),
(2, 4, 'Stir in the sun-dried tomatoes and fresh baby spinach. Let it simmer for a few minutes until the spinach is wilted and the sauce begins to thicken.'),
(2, 5, 'Return the chicken to the skillet, coat it with the creamy sauce, and cook for another 5 minutes until heated through and cooked to 165°F.');

-- Seed Data: Ingredients for Mediterranean Quinoa Salad (recipe_id = 3)
INSERT INTO ingredients (recipe_id, name, quantity, unit, category) VALUES 
(3, 'Quinoa', 1, 'cup', 'Pantry'),
(3, 'Water', 2, 'cups', 'Pantry'),
(3, 'English Cucumber', 1, 'piece', 'Produce'),
(3, 'Cherry Tomatoes', 1, 'cup', 'Produce'),
(3, 'Kalamata Olives', 0.5, 'cup', 'Produce'),
(3, 'Feta Cheese', 0.5, 'cup', 'Dairy'),
(3, 'Red Onion', 0.25, 'cup', 'Produce'),
(3, 'Olive Oil', 3, 'tbsp', 'Pantry'),
(3, 'Lemon Juice', 2, 'tbsp', 'Produce');

-- Seed Data: Instructions for Mediterranean Quinoa Salad (recipe_id = 3)
INSERT INTO instructions (recipe_id, step_number, instruction) VALUES 
(3, 1, 'Rinse quinoa in cold water. In a medium saucepan, combine quinoa and water, bring to a boil, cover, and simmer for 15 minutes. Remove from heat and let cool.'),
(3, 2, 'Dice the cucumber, halve the cherry tomatoes, slice the olives, and finely chop the red onion.'),
(3, 3, 'In a large bowl, combine the cooled quinoa and all the chopped vegetables.'),
(3, 4, 'Whisk together the olive oil and fresh lemon juice, then drizzle it over the salad and toss well to combine.'),
(3, 5, 'Crumble the feta cheese on top, toss gently once more, and chill in the refrigerator for at least 30 minutes before serving.');
