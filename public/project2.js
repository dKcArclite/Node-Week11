$(document).ready(function () {
    $('#BooksList').DataTable({
        "createdRow": function (row, data, index) {
            if (data[4] > 0) {
                //$('td', row).eq(6).addClass('hide');
                var cell = $('td', row).eq(6);
                var btn = cell.find("#btnAdd");
                btn.addClass('hide');
            }
        }
    });

    var table = $('#BooksList').DataTable();

    $('#BooksList tbody').on('click', 'tr', function () {
        var data = table.row(this).data();
        $('#modal-title').val(data[10]);
        $('#modal-author').val(data[2]);
        $('#modal-copyright').val(data[3]);
        $('#modal-isbn').val(data[7]);
        $('#modal-pages').val(data[8]);
        $('#modal-description').text(data[5]);  
        $('#thumbnail').attr('src', data[9].replace(/&amp;/g, '&')); 
        $('#thumbnail').attr('alt', data[10]); 
        updateCount();
    });

    function updateCount() {
        var length = $('#modal-description').val().length;
        var length = 1000 - length;
        $('#chars').text(length);
    }

});