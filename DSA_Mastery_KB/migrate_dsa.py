import os
import shutil
from pathlib import Path

# Define the base directory
BASE_DIR = Path(r"c:\Projects\personal\Learning\fastapi\Fast-api-docs\DSA_Mastery_KB")

# Define the mapping from Old Path (relative to BASE_DIR) to New Path (relative to BASE_DIR)
# We use a list of tuples to process them in order.
MIGRATION_MAP = [
    # 00 Toolkit
    ("_00_The_Foundation", "🧰 00_toolkit"),
    
    # 01 Arrays & Strings
    ("_01_Linear_Data_Structures/01_Arrays_&_Strings", "📦 01_arrays_strings"),
    
    # 02 Linked Lists
    ("_01_Linear_Data_Structures/02_Linked_Lists", "🔗 02_linked_lists"),
    
    # 03 Stacks & Queues
    ("_01_Linear_Data_Structures/03_Stacks_&_Queues", "📚 03_stacks_queues"),
    
    # 04 Trees (Merging Trees, Heaps, Tries)
    ("_02_Hierarchical_Structures/01_Trees_&_BST", "🌲 04_trees"),
    ("_02_Hierarchical_Structures/02_Heaps_&_Priority_Queues", "🌲 04_trees"),
    ("_02_Hierarchical_Structures/03_Tries_&_Prefix_Trees", "🌲 04_trees"),
    
    # 05 Graphs (Merging Core and Union Find)
    ("_03_Graph_Universes/01_Graphs_Core", "🕸️ 05_graphs"),
    ("_03_Graph_Universes/02_Union_Find_(DSU)", "🕸️ 05_graphs"),
    
    # 06 Hashing (New, but we might have some content? No, mostly new)
    # We will create the folder later.
    
    # 07 Sorting & Searching
    ("_04_Algorithmic_Engines/01_Sorting_Searching", "📈 07_sorting_searching"),
    
    # 08 Dynamic Programming
    ("_04_Algorithmic_Engines/02_Dynamic_Programming", "🧩 08_dynamic_programming"),
    
    # 09 Advanced Patterns (Backtracking goes here)
    ("_04_Algorithmic_Engines/03_Backtracking", "⚙️ 09_advanced_patterns"),
    
    # 10 System Design DSA (Merging all system design)
    ("_05_System_Design_DSA/01_Caching_Strategies", "🏗️ 10_system_design_dsa"),
    ("_05_System_Design_DSA/02_Rate_Limiting", "🏗️ 10_system_design_dsa"),
    ("_05_System_Design_DSA/03_Data_Indexing", "🏗️ 10_system_design_dsa"),
]

def migrate():
    print("🚀 Starting Migration...")
    
    # 1. Create new directories first
    new_dirs = set(new for old, new in MIGRATION_MAP)
    new_dirs.add("🔍 06_hashing")
    new_dirs.add("🧪 11_interactive_playground")
    new_dirs.add("📝 12_daily_challenges")
    
    for new_dir in new_dirs:
        path = BASE_DIR / new_dir
        path.mkdir(parents=True, exist_ok=True)
        print(f"✅ Created directory: {new_dir}")

    # 2. Move files
    for old_rel, new_rel in MIGRATION_MAP:
        old_path = BASE_DIR / old_rel
        new_path = BASE_DIR / new_rel
        
        if not old_path.exists():
            print(f"⚠️ Source not found: {old_rel}")
            continue
            
        print(f"📦 Processing {old_rel} -> {new_rel}")
        
        # Walk through the old directory
        for root, dirs, files in os.walk(old_path):
            # Calculate relative path from the old_path root
            rel_path = Path(root).relative_to(old_path)
            
            # Target directory in the new structure
            target_dir = new_path / rel_path
            target_dir.mkdir(parents=True, exist_ok=True)
            
            for file in files:
                src_file = Path(root) / file
                dst_file = target_dir / file
                
                # Handle collisions (e.g. if multiple source folders have 'visual/' and same filename)
                if dst_file.exists():
                    print(f"  ⚠️ Collision: {dst_file.name} already exists. Renaming...")
                    stem = dst_file.stem
                    suffix = dst_file.suffix
                    dst_file = target_dir / f"{stem}_migrated{suffix}"
                
                shutil.move(str(src_file), str(dst_file))
                print(f"  Moved: {file}")

    # 3. Cleanup empty old directories
    # We do this carefully. We iterate over the top-level old folders.
    top_level_old = set(old.split("/")[0] for old, new in MIGRATION_MAP)
    for old_top in top_level_old:
        path = BASE_DIR / old_top
        if path.exists():
            try:
                # shutil.rmtree(path) # Too dangerous? 
                # Let's just try to remove if empty, or print a message
                print(f"🗑️  Please manually delete old folder: {old_top}")
            except Exception as e:
                print(f"Error removing {old_top}: {e}")

    print("✨ Migration Complete!")

if __name__ == "__main__":
    migrate()
