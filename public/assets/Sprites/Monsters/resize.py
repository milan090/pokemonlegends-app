from PIL import Image
import os

def resize_image(file_path, size=(128, 128)):
    try:
        with Image.open(file_path) as img:
            # Resize image with LANCZOS resampling for better quality
            resized_img = img.resize(size, Image.Resampling.LANCZOS)
            # Save back to same path, overwriting original
            resized_img.save(file_path)
            print(f"Successfully resized {file_path}")
    except Exception as e:
        print(f"Error processing {file_path}: {str(e)}")

def main():
    # Get current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Process images from 001.png to 050.png
    for i in range(1, 51):
        filename = f"{str(i).zfill(3)}.png"
        file_path = os.path.join(current_dir, filename)
        
        if os.path.exists(file_path):
            resize_image(file_path)
        else:
            print(f"File not found: {filename}")

if __name__ == "__main__":
    main()
