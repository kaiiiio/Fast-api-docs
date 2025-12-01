import os
import json

BASE_DIR = r"c:\Projects\personal\Learning\fastapi\Fast-api-docs\DSA_Mastery_KB"

STRUCTURE = {
    "🗺️_ROADMAP.md": "",
    "_00_The_Foundation": {
        "intuition": ["ram_and_pointers.md", "big_o_growth_charts.md", "recursion_trace_tree.md"],
        "visual": ["memory_visualizer.py"],
        "templates": ["sliding_window_blueprint.py", "two_pointer_blueprint.py", "bfs_dfs_blueprint.py"],
        "json": ["memory_map_snapshot.json"]
    },
    "_01_Linear_Data_Structures": {
        "01_Arrays_&_Strings": {
            "intuition": [],
            "visual": ["sliding_window_anim.py", "two_ptr_ASCII.md"],
            "implementation": ["dynamic_array.py", "string_builder.py"],
            "json": ["array_buffer.json", "string_immutable.json"]
        },
        "02_Linked_Lists": {
            "intuition": [],
            "visual": ["list_reversal_anim.py", "fast_slow_race.md"],
            "implementation": ["singly_linked.py", "doubly_linked.py"],
            "json": ["linked_list_state.json"]
        },
        "03_Stacks_&_Queues": {
            "intuition": [],
            "visual": ["stack_recursion_sim.py", "queue_buffer_anim.py"],
            "implementation": ["stack_using_array.py", "queue_using_ll.py"],
            "json": ["stack_trace.json", "circular_queue.json"]
        }
    },
    "_02_Hierarchical_Structures": {
        "01_Trees_&_BST": {
            "intuition": [],
            "visual": ["tree_printer.py", "traversal_paths.md"],
            "implementation": ["bst_insert_delete.py", "avl_self_balancing.py"],
            "json": ["binary_tree.json"]
        },
        "02_Heaps_&_Priority_Queues": {
            "intuition": [],
            "visual": ["heapify_sift_down.py", "array_vs_tree_view.md"],
            "implementation": ["min_heap.py"],
            "json": ["heap_array_map.json"]
        },
        "03_Tries_&_Prefix_Trees": {
            "intuition": [],
            "visual": ["autocomplete_sim.py"],
            "implementation": ["trie.py"],
            "json": ["trie_dictionary.json"]
        }
    },
    "_03_Graph_Universes": {
        "01_Graphs_Core": {
            "intuition": [],
            "visual": ["bfs_shockwave.py", "dfs_maze_runner.py"],
            "implementation": ["adjacency_list.py", "adjacency_matrix.py"],
            "json": ["graph_adj_list.json", "graph_weighted.json"]
        },
        "02_Union_Find_(DSU)": {
            "intuition": [],
            "visual": ["path_compression.md"],
            "implementation": ["disjoint_set.py"],
            "json": ["dsu_parents.json"]
        }
    },
    "_04_Algorithmic_Engines": {
        "01_Sorting_Searching": {
            "visual": ["merge_sort_split.py", "quick_sort_pivot.py"],
            "implementation": ["merge_sort.py", "quick_sort.py", "binary_search.py"],
            "json": ["sort_snapshot.json"]
        },
        "02_Dynamic_Programming": {
            "intuition": [],
            "visual": ["dp_grid_filler.py", "memoization_tree.md"],
            "implementation": ["0_1_knapsack.py", "climbing_stairs.py"],
            "json": ["dp_table_state.json"]
        },
        "03_Backtracking": {
            "intuition": [],
            "visual": ["n_queens_visual.py"],
            "implementation": ["permutations_subsets.py"],
            "json": ["decision_tree.json"]
        }
    },
    "_05_System_Design_DSA": {
        "01_Caching_Strategies": {
            "": ["lru_cache.py"],
            "json": ["lru_state.json"]
        },
        "02_Rate_Limiting": {
            "": ["sliding_window_log.py"],
            "json": ["redis_keys.json"]
        },
        "03_Data_Indexing": {
            "": ["inverted_index.py"],
            "json": ["index_map.json"]
        }
    }
}

def create_structure(base, structure):
    if not os.path.exists(base):
        os.makedirs(base)
    
    for name, content in structure.items():
        path = os.path.join(base, name)
        
        if isinstance(content, dict):
            create_structure(path, content)
        elif isinstance(content, list):
            if not os.path.exists(path):
                os.makedirs(path)
            for file in content:
                file_path = os.path.join(path, file)
                if not os.path.exists(file_path):
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write("") # Create empty file
        elif isinstance(content, str):
            # It's a file in the base directory
            if not os.path.exists(path):
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)

if __name__ == "__main__":
    create_structure(BASE_DIR, STRUCTURE)
    print(f"Created structure at {BASE_DIR}")
