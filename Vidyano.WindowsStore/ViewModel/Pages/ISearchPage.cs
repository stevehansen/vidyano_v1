using System.Threading.Tasks;

namespace Vidyano.ViewModel.Pages
{
    public interface ISearchPage
    {
        Task Search(string text);
    }
}