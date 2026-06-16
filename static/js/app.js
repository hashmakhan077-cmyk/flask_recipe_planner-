// GourmetLab Frontend Application Logic

// State management
let recipes = [];
let mealPlan = [];
let currentOpenRecipe = null;
let currentScaledServings = 4;
let activeTab = 'dashboard';

// Constants
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['Breakfast', 'Lunch', 'Dinner'];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setupNavigation();
    setupEventListeners();
    loadDashboardData();
    loadRecipes();
    loadMealPlan();
}

// 1. Navigation / SPA Router
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.target;
            switchTab(target);
        });
    });
}

function switchTab(tabId) {
    activeTab = tabId;
    
    // Update nav items active state
    document.querySelectorAll('.nav-item').forEach(btn => {
        if (btn.dataset.target === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update content pane active state
    document.querySelectorAll('.content-pane').forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });

    // Specific loaders on tab view
    if (tabId === 'dashboard') {
        loadDashboardData();
    } else if (tabId === 'explorer') {
        renderRecipes(recipes);
    } else if (tabId === 'planner') {
        renderMealPlanner();
    } else if (tabId === 'grocery') {
        loadGroceryList();
    }
}

// 2. Event Listeners Setup
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('recipe-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterRecipes(e.target.value, getActiveCategory());
        });
    }

    // Category pills
    const pills = document.querySelectorAll('#category-pills .pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            filterRecipes(document.getElementById('recipe-search').value, pill.dataset.category);
        });
    });

    // Recipe Creator Dynamic Fields
    document.getElementById('add-ing-btn').addEventListener('click', addIngredientInputRow);
    document.getElementById('add-step-btn').addEventListener('click', addStepInputRow);

    // Form Submission
    document.getElementById('create-recipe-form').addEventListener('submit', handleRecipeSubmission);

    // Modal Events
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('recipe-modal').addEventListener('click', (e) => {
        if (e.target.id === 'recipe-modal') closeModal();
    });

    // Serving Scalers
    document.getElementById('scaler-minus').addEventListener('click', () => adjustServings(-1));
    document.getElementById('scaler-plus').addEventListener('click', () => adjustServings(1));

    // Add to Meal Plan from Modal
    document.getElementById('add-to-plan-btn').addEventListener('click', handleAddToPlanFromModal);
    
    // Delete Recipe from Modal
    document.getElementById('delete-recipe-btn').addEventListener('click', handleDeleteRecipeFromModal);

    // Clear Plan
    document.getElementById('clear-plan-btn').addEventListener('click', handleClearMealPlan);

    // Grocery actions
    document.getElementById('copy-grocery-btn').addEventListener('click', handleCopyGroceryList);
    document.getElementById('print-grocery-btn').addEventListener('click', () => window.print());
}

// 3. API & Data Fetching
async function loadRecipes() {
    try {
        const response = await fetch('/api/recipes');
        recipes = await response.json();
        updateStats();
    } catch (err) {
        console.error("Error loading recipes", err);
    }
}

async function loadMealPlan() {
    try {
        const response = await fetch('/api/meal-plan');
        mealPlan = await response.json();
        updateStats();
        updateGroceryCount();
    } catch (err) {
        console.error("Error loading meal plan", err);
    }
}

async function loadDashboardData() {
    await loadRecipes();
    await loadMealPlan();
    
    // Today's Meals Section
    const today = getTodayDayName();
    const todayMealsContainer = document.getElementById('today-meals');
    todayMealsContainer.innerHTML = '';
    
    MEALS.forEach(mealType => {
        const planItem = mealPlan.find(item => item.day_of_week === today && item.meal_type === mealType);
        
        const card = document.createElement('div');
        if (planItem) {
            card.className = 'today-meal-card';
            card.addEventListener('click', () => openRecipeDetail(planItem.recipe_id));
            card.innerHTML = `
                <span class="today-meal-type">${mealType}</span>
                <span class="today-meal-title">${planItem.recipe_title}</span>
                <img src="${planItem.recipe_image || '/static/images/default_recipe.png'}" alt="${planItem.recipe_title}">
            `;
        } else {
            card.className = 'today-meal-card today-meal-empty';
            card.addEventListener('click', () => switchTab('planner'));
            card.innerHTML = `
                <span class="today-meal-type">${mealType}</span>
                <span>+ Add to plan</span>
            `;
        }
        todayMealsContainer.appendChild(card);
    });

    // Featured Recipe Section
    const featuredContainer = document.getElementById('featured-recipe');
    if (recipes.length > 0 && featuredContainer) {
        // Pick recipe of the day based on date
        const dayOfMonth = new Date().getDate();
        const recipeIndex = dayOfMonth % recipes.length;
        const featured = recipes[recipeIndex];
        
        featuredContainer.innerHTML = `
            <h2 class="section-title">Chef's Daily Feature</h2>
            <div class="featured-recipe-layout" onclick="openRecipeDetail(${featured.id})">
                <div class="featured-img-wrap">
                    <span class="featured-badge">${featured.category}</span>
                    <img src="${featured.image_url || '/static/images/default_recipe.png'}" alt="${featured.title}">
                </div>
                <h3 class="featured-title">${featured.title}</h3>
                <p class="featured-desc">${featured.description || 'No description provided.'}</p>
            </div>
        `;
    } else if (featuredContainer) {
        featuredContainer.innerHTML = `
            <h2 class="section-title">Chef's Daily Feature</h2>
            <p style="color: var(--text-muted);">Create some recipes to see them featured here!</p>
        `;
    }
}

// 4. Recipe Explorer Rendering & Search
function renderRecipes(recipesList) {
    const grid = document.getElementById('recipe-grid');
    grid.innerHTML = '';
    
    if (recipesList.length === 0) {
        grid.innerHTML = `<p style="grid-column: span 3; text-align: center; color: var(--text-muted); margin-top: 3rem;">No recipes found. Try adding a new one!</p>`;
        return;
    }

    recipesList.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card glass';
        card.addEventListener('click', () => openRecipeDetail(recipe.id));
        
        card.innerHTML = `
            <div class="recipe-img-container">
                <span class="recipe-cat-badge">${recipe.category}</span>
                <img src="${recipe.image_url || '/static/images/default_recipe.png'}" alt="${recipe.title}">
            </div>
            <div class="recipe-info">
                <h3 class="recipe-card-title">${recipe.title}</h3>
                <p class="recipe-card-desc">${recipe.description || ''}</p>
                <div class="recipe-card-meta">
                    <span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Prep: ${recipe.prep_time}m
                    </span>
                    <span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                        Cook: ${recipe.cook_time}m
                    </span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterRecipes(query, category) {
    let filtered = recipes;
    
    if (category && category !== 'All') {
        filtered = filtered.filter(r => r.category === category);
    }
    
    if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(r => 
            r.title.toLowerCase().includes(q) || 
            (r.description && r.description.toLowerCase().includes(q))
        );
    }
    
    renderRecipes(filtered);
}

function getActiveCategory() {
    const activePill = document.querySelector('#category-pills .pill.active');
    return activePill ? activePill.dataset.category : 'All';
}

// 5. Recipe Detail Modal & Servings Scaling
async function openRecipeDetail(recipeId) {
    try {
        const response = await fetch(`/api/recipes/${recipeId}`);
        if (!response.ok) throw new Error("Could not find recipe");
        
        currentOpenRecipe = await response.json();
        currentScaledServings = currentOpenRecipe.servings;
        
        // Populate modal HTML
        document.getElementById('modal-title').textContent = currentOpenRecipe.title;
        document.getElementById('modal-category').textContent = currentOpenRecipe.category;
        document.getElementById('modal-desc').textContent = currentOpenRecipe.description || '';
        document.getElementById('modal-prep').textContent = `${currentOpenRecipe.prep_time}m`;
        document.getElementById('modal-cook').textContent = `${currentOpenRecipe.cook_time}m`;
        
        const banner = document.getElementById('modal-image');
        banner.style.backgroundImage = `url('${currentOpenRecipe.image_url || '/static/images/default_recipe.png'}')`;
        
        document.getElementById('scaler-qty').textContent = currentScaledServings;
        
        // Load Ingredients & Steps
        renderScaledIngredients();
        renderInstructions();
        
        // Show modal
        const modal = document.getElementById('recipe-modal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // lock scroll
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function closeModal() {
    const modal = document.getElementById('recipe-modal');
    modal.classList.remove('active');
    document.body.style.overflow = ''; // unlock scroll
    currentOpenRecipe = null;
}

function adjustServings(delta) {
    if (!currentOpenRecipe) return;
    const newServings = currentScaledServings + delta;
    if (newServings < 1) return;
    
    currentScaledServings = newServings;
    document.getElementById('scaler-qty').textContent = currentScaledServings;
    renderScaledIngredients();
}

function renderScaledIngredients() {
    const list = document.getElementById('modal-ingredients-list');
    list.innerHTML = '';
    
    const factor = currentScaledServings / currentOpenRecipe.servings;
    
    currentOpenRecipe.ingredients.forEach((ing, index) => {
        const scaledQty = ing.quantity * factor;
        const formattedQty = Number(scaledQty.toFixed(2));
        
        const li = document.createElement('li');
        li.className = 'ing-checklist-item';
        
        // Load checkbox state from localStorage if user checked it off during cooking session
        const storageKey = `recipe-${currentOpenRecipe.id}-ing-${index}`;
        const isChecked = localStorage.getItem(storageKey) === 'true';
        if (isChecked) li.classList.add('checked');
        
        li.innerHTML = `
            <span class="ing-checkbox">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <span class="ing-text">
                <span class="ing-qty-val">${formattedQty > 0 ? formattedQty : ''}</span> 
                <span class="ing-unit-val">${ing.unit || ''}</span> 
                ${ing.name}
            </span>
        `;
        
        li.addEventListener('click', () => {
            li.classList.toggle('checked');
            localStorage.setItem(storageKey, li.classList.contains('checked'));
        });
        
        list.appendChild(li);
    });
}

function renderInstructions() {
    const list = document.getElementById('modal-instructions-list');
    list.innerHTML = '';
    
    currentOpenRecipe.instructions.forEach(step => {
        const li = document.createElement('li');
        li.className = 'instruction-step';
        li.innerHTML = `
            <div class="step-num-circle">${step.step_number}</div>
            <div class="step-text-detail">${step.instruction}</div>
        `;
        list.appendChild(li);
    });
}

async function handleAddToPlanFromModal() {
    if (!currentOpenRecipe) return;
    
    const day = document.getElementById('modal-plan-day').value;
    const type = document.getElementById('modal-plan-type').value;
    
    try {
        const response = await fetch('/api/meal-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                day_of_week: day,
                meal_type: type,
                recipe_id: currentOpenRecipe.id
            })
        });
        
        if (!response.ok) throw new Error("Could not add to plan");
        
        showToast(`Added ${currentOpenRecipe.title} to ${day} ${type}!`);
        closeModal();
        loadMealPlan();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleDeleteRecipeFromModal() {
    if (!currentOpenRecipe) return;
    
    if (!confirm(`Are you sure you want to delete "${currentOpenRecipe.title}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/recipes/${currentOpenRecipe.id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error("Could not delete recipe");
        
        showToast(`Successfully deleted "${currentOpenRecipe.title}"`);
        closeModal();
        loadRecipes();
        loadMealPlan();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// 6. Weekly Meal Planner Grid & Slots
function renderMealPlanner() {
    const grid = document.getElementById('planner-grid');
    grid.innerHTML = '';
    
    const today = getTodayDayName();

    DAYS.forEach(day => {
        const col = document.createElement('div');
        col.className = 'day-column';
        if (day === today) col.classList.add('today');
        
        col.innerHTML = `<div class="day-name">${day}</div>`;
        
        MEALS.forEach(mealType => {
            const planItem = mealPlan.find(item => item.day_of_week === day && item.meal_type === mealType);
            const slot = document.createElement('div');
            slot.className = 'meal-slot';
            slot.innerHTML = `<span class="meal-slot-label">${mealType}</span>`;
            
            const card = document.createElement('div');
            if (planItem) {
                card.className = 'meal-slot-card';
                card.innerHTML = `
                    <span onclick="openRecipeDetail(${planItem.recipe_id})">${planItem.recipe_title}</span>
                    <button class="remove-meal-btn" onclick="removeMealSlot('${day}', '${mealType}')" title="Remove meal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                `;
            } else {
                // Return a beautiful selection dropdown inside the slot!
                card.className = 'meal-slot-card empty';
                
                // Create custom quick dropdown element
                let optionsHtml = `<option value="">+ Add meal</option>`;
                recipes.forEach(recipe => {
                    optionsHtml += `<option value="${recipe.id}">${recipe.title}</option>`;
                });
                
                card.innerHTML = `
                    <select class="meal-quick-select" style="background:transparent; border:none; color:inherit; font-size:inherit; width:100%; cursor:pointer;" onchange="handleQuickSelectMeal(this, '${day}', '${mealType}')">
                        ${optionsHtml}
                    </select>
                `;
            }
            
            slot.appendChild(card);
            col.appendChild(slot);
        });
        
        grid.appendChild(col);
    });
}

async function handleQuickSelectMeal(selectEl, day, mealType) {
    const recipeId = selectEl.value;
    if (!recipeId) return;
    
    try {
        const response = await fetch('/api/meal-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                day_of_week: day,
                meal_type: mealType,
                recipe_id: parseInt(recipeId)
            })
        });
        
        if (!response.ok) throw new Error("Could not update slot");
        
        const selectedRecipe = recipes.find(r => r.id === parseInt(recipeId));
        showToast(`Added ${selectedRecipe.title} to ${day} ${mealType}!`);
        await loadMealPlan();
        renderMealPlanner();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function removeMealSlot(day, mealType) {
    try {
        const response = await fetch('/api/meal-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                day_of_week: day,
                meal_type: mealType,
                recipe_id: null
            })
        });
        
        if (!response.ok) throw new Error("Could not remove meal");
        
        showToast(`Removed meal from ${day} ${mealType}`);
        await loadMealPlan();
        renderMealPlanner();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleClearMealPlan() {
    if (!confirm("Are you sure you want to clear the entire weekly meal plan?")) return;
    
    try {
        const response = await fetch('/api/meal-plan/clear', {
            method: 'POST'
        });
        
        if (!response.ok) throw new Error("Could not clear meal plan");
        
        showToast("Weekly meal plan cleared!");
        await loadMealPlan();
        renderMealPlanner();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// 7. Grocery Shopping List Logic
async function loadGroceryList() {
    const container = document.getElementById('grocery-list-container');
    container.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const response = await fetch('/api/grocery-list');
        const groceryData = await response.json();
        
        container.innerHTML = '';
        const categories = Object.keys(groceryData);
        
        if (categories.length === 0) {
            container.innerHTML = `
                <div class="grocery-empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    <p>Your grocery list is empty. Add recipes to your weekly meal planner first!</p>
                    <button class="btn btn-primary" onclick="switchTab('planner')">Go to Meal Planner</button>
                </div>
            `;
            return;
        }
        
        categories.forEach(catName => {
            const card = document.createElement('div');
            card.className = 'grocery-category-card glass';
            
            let itemsHtml = '';
            groceryData[catName].forEach((item, index) => {
                const storageKey = `grocery-checked-${catName}-${item.name}`;
                const isChecked = localStorage.getItem(storageKey) === 'true';
                
                itemsHtml += `
                    <li class="grocery-item ${isChecked ? 'checked' : ''}" onclick="toggleGroceryItem(this, '${catName}', '${item.name}')">
                        <span class="grocery-checkbox">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                        <span class="grocery-item-text">
                            <strong>${item.quantity > 0 ? item.quantity : ''} ${item.unit || ''}</strong> ${item.name}
                        </span>
                    </li>
                `;
            });
            
            card.innerHTML = `
                <h3 class="grocery-category-title">${catName}</h3>
                <ul class="grocery-items-list">
                    ${itemsHtml}
                </ul>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<p style="text-align:center; color:var(--color-danger)">Error compiling grocery list: ${err.message}</p>`;
    }
}

function toggleGroceryItem(liElement, category, itemName) {
    liElement.classList.toggle('checked');
    const storageKey = `grocery-checked-${category}-${itemName}`;
    localStorage.setItem(storageKey, liElement.classList.contains('checked'));
    updateGroceryCount();
}

async function handleCopyGroceryList() {
    try {
        const response = await fetch('/api/grocery-list');
        const groceryData = await response.json();
        
        let textBlock = `GOURMETLAB GROCERY SHOPPING LIST\n=================================\n`;
        const categories = Object.keys(groceryData);
        
        if (categories.length === 0) {
            showToast("Nothing to copy!", "error");
            return;
        }
        
        categories.forEach(cat => {
            textBlock += `\n[ ${cat.toUpperCase()} ]\n`;
            groceryData[cat].forEach(item => {
                textBlock += `- ${item.quantity > 0 ? item.quantity + ' ' : ''}${item.unit ? item.unit + ' ' : ''}${item.name}\n`;
            });
        });
        
        await navigator.clipboard.writeText(textBlock);
        showToast("Grocery list copied to clipboard!");
    } catch (err) {
        showToast("Failed to copy grocery list: " + err.message, "error");
    }
}

// 8. Recipe Creation Dynamic Forms
function addIngredientInputRow() {
    const container = document.getElementById('ingredients-inputs');
    const row = document.createElement('div');
    row.className = 'ingredient-row-input';
    row.innerHTML = `
        <input type="number" step="any" class="ing-qty" placeholder="Qty" required style="width: 80px;">
        <input type="text" class="ing-unit" placeholder="Unit (e.g. g, tbsp, cup)" style="width: 120px;">
        <input type="text" class="ing-name" placeholder="Ingredient Name" required style="flex-grow: 1;">
        <select class="ing-cat" style="width: 140px;">
            <option value="Produce">Produce</option>
            <option value="Meat">Meat</option>
            <option value="Dairy">Dairy</option>
            <option value="Pantry" selected>Pantry</option>
            <option value="Spices">Spices</option>
        </select>
        <button type="button" class="btn-icon delete-row-btn" tabindex="-1" onclick="deleteInputRow(this)">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;
    container.appendChild(row);
}

function addStepInputRow() {
    const container = document.getElementById('steps-inputs');
    const nextStepNum = container.children.length + 1;
    
    const row = document.createElement('div');
    row.className = 'step-row-input';
    row.innerHTML = `
        <span class="step-number-badge">${nextStepNum}</span>
        <textarea class="step-text" rows="2" placeholder="Describe the instruction step..." required></textarea>
        <button type="button" class="btn-icon delete-row-btn" tabindex="-1" onclick="deleteStepInputRow(this)">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;
    container.appendChild(row);
}

function deleteInputRow(buttonEl) {
    const row = buttonEl.closest('.ingredient-row-input');
    row.remove();
}

function deleteStepInputRow(buttonEl) {
    const row = buttonEl.closest('.step-row-input');
    row.remove();
    recalculateStepNumbers();
}

function recalculateStepNumbers() {
    const steps = document.querySelectorAll('#steps-inputs .step-row-input');
    steps.forEach((step, index) => {
        step.querySelector('.step-number-badge').textContent = index + 1;
    });
}

async function handleRecipeSubmission(e) {
    e.preventDefault();
    
    // Compile ingredients
    const ingredientRows = document.querySelectorAll('.ingredient-row-input');
    const ingredientsArray = [];
    ingredientRows.forEach(row => {
        const qty = parseFloat(row.querySelector('.ing-qty').value);
        const unit = row.querySelector('.ing-unit').value;
        const name = row.querySelector('.ing-name').value;
        const category = row.querySelector('.ing-cat').value;
        
        if (name) {
            ingredientsArray.push({
                quantity: qty,
                unit: unit,
                name: name,
                category: category
            });
        }
    });

    // Compile steps
    const stepRows = document.querySelectorAll('.step-row-input');
    const instructionsArray = [];
    stepRows.forEach((row, index) => {
        const text = row.querySelector('.step-text').value;
        if (text) {
            instructionsArray.push({
                step_number: index + 1,
                instruction: text
            });
        }
    });

    // Extract basic recipe properties
    const recipeData = {
        title: document.getElementById('recipe-title').value,
        description: document.getElementById('recipe-desc').value,
        category: document.getElementById('recipe-category').value,
        servings: parseInt(document.getElementById('recipe-servings').value),
        prep_time: parseInt(document.getElementById('recipe-prep').value),
        cook_time: parseInt(document.getElementById('recipe-cook').value),
        image_url: document.getElementById('recipe-image').value || null,
        ingredients: ingredientsArray,
        instructions: instructionsArray
    };

    try {
        const response = await fetch('/api/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipeData)
        });
        
        if (!response.ok) {
            const errBody = await response.json();
            throw new Error(errBody.error || "Could not save recipe");
        }
        
        showToast("Recipe added successfully!");
        
        // Reset form
        document.getElementById('create-recipe-form').reset();
        document.getElementById('ingredients-inputs').innerHTML = `
            <div class="ingredient-row-input">
                <input type="number" step="any" class="ing-qty" placeholder="Qty" required style="width: 80px;">
                <input type="text" class="ing-unit" placeholder="Unit (e.g. g, tbsp, cup)" style="width: 120px;">
                <input type="text" class="ing-name" placeholder="Ingredient Name" required style="flex-grow: 1;">
                <select class="ing-cat" style="width: 140px;">
                    <option value="Produce">Produce</option>
                    <option value="Meat">Meat</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Pantry" selected>Pantry</option>
                    <option value="Spices">Spices</option>
                </select>
                <button type="button" class="btn-icon delete-row-btn" tabindex="-1" onclick="deleteInputRow(this)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `;
        document.getElementById('steps-inputs').innerHTML = `
            <div class="step-row-input">
                <span class="step-number-badge">1</span>
                <textarea class="step-text" rows="2" placeholder="Describe the instruction step..." required></textarea>
                <button type="button" class="btn-icon delete-row-btn" tabindex="-1" onclick="deleteStepInputRow(this)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `;
        
        await loadRecipes();
        switchTab('explorer');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// 9. Utilities & UI Helpers
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    
    if (type === 'error') {
        toast.classList.add('error');
    } else {
        toast.classList.remove('error');
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

function getTodayDayName() {
    const date = new Date();
    const dayIndex = date.getDay(); // Sunday = 0, Monday = 1, etc.
    const daysMapping = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return daysMapping[dayIndex];
}

function updateStats() {
    const recipesCountEl = document.getElementById('stat-recipes');
    const mealsPlannedEl = document.getElementById('stat-meals');
    const groceryItemsEl = document.getElementById('stat-groceries');
    
    if (recipesCountEl) recipesCountEl.textContent = recipes.length;
    if (mealsPlannedEl) mealsPlannedEl.textContent = mealPlan.length;
    
    // Count distinct ingredients needed in mealPlan
    if (groceryItemsEl) {
        // Find categories
        fetch('/api/grocery-list')
            .then(res => res.json())
            .then(data => {
                let totalItems = 0;
                Object.values(data).forEach(arr => {
                    totalItems += arr.length;
                });
                groceryItemsEl.textContent = totalItems;
            });
    }
}

function updateGroceryCount() {
    fetch('/api/grocery-list')
        .then(res => res.json())
        .then(data => {
            let totalItems = 0;
            let uncheckedItems = 0;
            
            Object.keys(data).forEach(cat => {
                data[cat].forEach(item => {
                    totalItems++;
                    const storageKey = `grocery-checked-${cat}-${item.name}`;
                    const isChecked = localStorage.getItem(storageKey) === 'true';
                    if (!isChecked) uncheckedItems++;
                });
            });
            
            const badge = document.getElementById('grocery-count');
            if (badge) {
                badge.textContent = uncheckedItems;
                badge.style.display = uncheckedItems > 0 ? 'inline-block' : 'none';
            }
        });
}
