namespace Vidyano.ViewModel.Actions
{
    sealed class ShowHelp : ActionBase
    {
        public ShowHelp(Definition definition, PersistentObject parent, Query query)
            : base(definition, parent, query)
        {
            IsVisible = false;
        }
    }
}