namespace Vidyano.ViewModel
{
    public class PersistentObjectTabQuery : PersistentObjectTab
    {
        private bool _IsEmpty = true;
        private string _TextSearch;

        internal PersistentObjectTabQuery(Query query)
            : base(query.Label, query.Parent)
        {
            Query = query;
            TextSearch = Query.TextSearch;
        }

        public string TextSearch
        {
            get { return _TextSearch; }
            set
            {
                if (SetProperty(ref _TextSearch, value))
                    IsEmpty = string.IsNullOrEmpty(value);
            }
        }

        public bool IsEmpty
        {
            get { return _IsEmpty; }
            set { SetProperty(ref _IsEmpty, value); }
        }

        public Query Query { get; private set; }
    }
}