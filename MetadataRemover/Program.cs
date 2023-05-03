using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ImageMagick;

namespace RemoveMetadata
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.Title = "Remove Metadata Tool";
            Console.WriteLine("Remove Metadata Tool");
            Console.WriteLine("--------------------");
            Console.WriteLine();

            string directoryPath = GetDirectoryPathFromUser();
            string[] profilesToRemove = GetProfilesToRemoveFromUser();
            bool removeAllMetadata = false;

            if (profilesToRemove.Length == 0)
            {
                Console.WriteLine("No specific metadata profiles to remove were entered.");
                Console.Write("Do you want to remove all metadata profiles? (y/n) ");
                var key = Console.ReadKey();
                Console.WriteLine();

                if (key.KeyChar == 'y')
                {
                    removeAllMetadata = true;
                }
                else
                {
                    Console.WriteLine("No metadata profiles will be removed.");
                }
            }

            string[] filePaths = GetFilePaths(directoryPath);

            Console.WriteLine($"Found {filePaths.Length} files.");

            if (removeAllMetadata)
            {
                Console.Write("All metadata profiles will be removed. Are you sure? (y/n) ");
                var key = Console.ReadKey();
                Console.WriteLine();

                if (key.KeyChar != 'y')
                {
                    Console.WriteLine("No metadata profiles will be removed.");
                    removeAllMetadata = false;
                }
            }

            if (!removeAllMetadata && profilesToRemove.Length > 0)
            {
                Console.WriteLine("The following metadata profiles will be removed: ");
                Console.WriteLine(string.Join(", ", profilesToRemove));
            }

            int quality = GetImageQualityFromUser();

            Console.Write("Press any key to start processing the images...");
            Console.ReadKey();
            Console.WriteLine();
            ShowSpinner();
            for (int i = 0; i < filePaths.Length; i++)
            {
                Console.Write($"\rProcessing file {i + 1} of {filePaths.Length}...");

                try
                {
                    ProcessFile(filePaths[i], profilesToRemove, quality);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"\nError processing file {filePaths[i]}: {ex.Message}");
                }
            }
            Console.WriteLine("\nDone!");
            Console.ReadLine();
        }

        static void ShowSpinner()
        {
            Console.Title = "Processing...";
            var counter = 0;
            for (int i = 0; i < 50; i++)
            {
                switch (counter % 4)
                {
                    case 0: Console.Title = "Processing.../"; break;
                    case 1: Console.Title = "Processing...-"; break;
                    case 2: Console.Title = "Processing...\\"; break;
                    case 3: Console.Title = "Processing...|"; break;
                }
                counter++;
                Thread.Sleep(100);
            }
            Console.Title = "Remove Metadata Tool";
        }

        static int GetImageQualityFromUser()
        {
            Console.Write("Enter the quality of the image (0-100): ");
            int quality;
            while (!int.TryParse(Console.ReadLine(), out quality) || quality < 0 || quality > 100)
            {
                Console.Write("Invalid input. Please enter a number between 0 and 100: ");
            }
            return quality;
        }

        static string GetDirectoryPathFromUser()
        {
            Console.Write("Enter the path to the directory containing the images: ");
            return Console.ReadLine();
        }

        static string[] GetProfilesToRemoveFromUser()
        {
            Console.Write("Enter the metadata profiles to remove (e.g., EXIF IPTC XMP): ");
            return Console.ReadLine().Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        }

        static string[] GetFilePaths(string directoryPath)
        {
            return Directory.GetFiles(directoryPath, "*.*", SearchOption.AllDirectories)
                .Where(file => file.EndsWith(".jpg") || file.EndsWith(".jpeg") || file.EndsWith(".png") || file.EndsWith(".gif") || file.EndsWith(".bmp"))
                .ToArray();
        }

        static void ProcessFile(string filePath, string[] profilesToRemove, int quality = 100)
        {
            var image = new MagickImage(filePath);

            if (profilesToRemove.Length == 0)
            {
                foreach (var profile in image.ProfileNames)
                {
                    image.RemoveProfile(profile);
                }
            }
            else
            {
                foreach (var profile in profilesToRemove)
                {
                    switch (profile)
                    {
                        case "EXIF":
                            var exifProfile = image.GetExifProfile();
                            if (exifProfile != null) image.RemoveProfile(exifProfile);
                            break;
                        case "IPTC":
                            var iptcProfile = image.GetIptcProfile();
                            if (iptcProfile != null) image.RemoveProfile(iptcProfile);
                            break;
                        case "XMP":
                            var xmpProfile = image.GetXmpProfile();
                            if (xmpProfile != null) image.RemoveProfile(xmpProfile);
                            break;
                        default:
                            break;
                    }
                }
            }

            string outputDirectoryPath = Path.Combine(Path.GetDirectoryName(filePath), "WithoutMetadata");
            Directory.CreateDirectory(outputDirectoryPath);

            string newFilePath = Path.Combine(outputDirectoryPath, Path.GetFileNameWithoutExtension(filePath) + "-without-metadata" + Path.GetExtension(filePath));
            image.Quality = quality;
            image.Write(newFilePath);

            FileInfo originalFile = new FileInfo(filePath);
            new FileInfo(newFilePath)
            {
                CreationTime = originalFile.CreationTime,
                LastWriteTime = originalFile.LastWriteTime
            };
        }
    }
}
