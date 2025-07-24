import json

def process_minecraft_items(input_file, output_file):
    """
    Process Minecraft items JSON to replace empty image values with 'item.png'
    
    Args:
        input_file (str): Path to input JSON file
        output_file (str): Path to output JSON file
    """
    try:
        # Read the JSON file
        with open(input_file, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        # Counter for tracking changes
        changes_made = 0
        
        # Process each item in the items array
        if 'items' in data:
            for item in data['items']:
                # Check if image field exists and is empty
                if 'image' in item and item['image'] == "":
                    item['image'] = f"{item['item']}.png"
                    changes_made += 1
                    print(f"Updated {item['item']}: image set to '{item['item']}.png'")
        
        # Write the updated data back to file
        with open(output_file, 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=4, ensure_ascii=False)
        
        print(f"\nProcessing complete!")
        print(f"Total items processed: {len(data.get('items', []))}")
        print(f"Images updated: {changes_made}")
        print(f"Output saved to: {output_file}")
        
    except FileNotFoundError:
        print(f"Error: File '{input_file}' not found.")
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON format in '{input_file}'.")
    except Exception as e:
        print(f"Error: {str(e)}")

def main():
    # File paths
    input_file = "data.json"  # Your input file
    output_file = "data_updated.json"  # Output file
    
    print("Minecraft Items Image Processor")
    print("=" * 40)
    
    # Process the file
    process_minecraft_items(input_file, output_file)

if __name__ == "__main__":
    main()