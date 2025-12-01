import os
import shutil
from pathlib import Path

BASE_DIR = Path(r"c:\Projects\personal\Learning\fastapi\Fast-api-docs\DSA_Mastery_KB")

def remove_emojis():
    print("🚀 Renaming folders (removing emojis)...")
    
    # List of expected emoji-prefixed folders to clean ones
    # We can just iterate and strip non-ascii or specific prefixes, 
    # but explicit mapping is safer to avoid accidents.
    
    mapping = {
        "🧰 00_toolkit": "00_toolkit",
        "📦 01_arrays_strings": "01_arrays_strings",
        "🔗 02_linked_lists": "02_linked_lists",
        "📚 03_stacks_queues": "03_stacks_queues",
        "🌲 04_trees": "04_trees",
        "🕸️ 05_graphs": "05_graphs",
        "🔍 06_hashing": "06_hashing",
        "📈 07_sorting_searching": "07_sorting_searching",
        "🧩 08_dynamic_programming": "08_dynamic_programming",
        "⚙️ 09_advanced_patterns": "09_advanced_patterns",
        "🏗️ 10_system_design_dsa": "10_system_design_dsa",
        "🧪 11_interactive_playground": "11_interactive_playground",
        "📝 12_daily_challenges": "12_daily_challenges"
    }
    
    for old_name, new_name in mapping.items():
        old_path = BASE_DIR / old_name
        new_path = BASE_DIR / new_name
        
        if old_path.exists():
            try:
                os.rename(old_path, new_path)
                print(f"✅ Renamed: {old_name} -> {new_name}")
            except Exception as e:
                print(f"❌ Error renaming {old_name}: {e}")
        else:
            print(f"⚠️ Not found: {old_name}")

if __name__ == "__main__":
    remove_emojis()
